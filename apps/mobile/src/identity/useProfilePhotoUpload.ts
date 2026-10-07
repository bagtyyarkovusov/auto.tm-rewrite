import { useState } from "react";
import { onlineManager } from "@tanstack/react-query";
import { create } from "zustand";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { UploadsSchemas } from "@auto-tm/contracts";

import { ApiError, apiClient } from "../api/client";
import { useSetProfilePhoto } from "../api/identity/useSetProfilePhoto";
import { compressPhoto, CompressionError, type CompressionResult } from "../listings/uploadStaging/compressor";

import { profileNoticeStore } from "./profileNotice";

type PhotoUploadState =
  | { status: "idle" }
  | { status: "uploading"; uri: string; percent: number }
  | { status: "failed" | "offline" | "too_large" | "unsupported" };
let selected: { asset: ImagePicker.ImagePickerAsset; compressed?: CompressionResult } | null = null;
const MAX_BYTES = 5 * 1024 * 1024;

// Route dismissal removes observers, not the job or its result.
export const profilePhotoUploadStore = create<{ state: PhotoUploadState }>()(() => ({ state: { status: "idle" } }));

/** Picks, shrinks and uploads one Profile Photo independently of Listing drafts. */
export function useProfilePhotoUpload() {
  const state = profilePhotoUploadStore((store) => store.state);
  const [cameraDenied, setCameraDenied] = useState(false);
  const setPhoto = useSetProfilePhoto();

  async function upload() {
    const photo = selected;
    if (!photo) return;
    profilePhotoUploadStore.setState({ state: { status: "uploading", uri: photo.compressed?.uri ?? photo.asset.uri, percent: 0 } });
    try {
      const { asset } = photo;
      if ((asset.mimeType && !["image/jpeg", "image/png", "image/webp"].includes(asset.mimeType)) || asset.width <= 0 || asset.height <= 0) {
        profilePhotoUploadStore.setState({ state: { status: "unsupported" } });
        return;
      }
      photo.compressed ??= await compressPhoto(asset.uri, `${FileSystem.cacheDirectory}profile-photo-${Date.now()}.jpg`, { maxDimension: 512, width: asset.width, height: asset.height });
      const compressed = photo.compressed;
      if (compressed.fileSize > MAX_BYTES) {
        profilePhotoUploadStore.setState({ state: { status: "too_large" } });
        return;
      }
      if (compressed.fileSize <= 0 || compressed.width > 512 || compressed.height > 512) {
        profilePhotoUploadStore.setState({ state: { status: "unsupported" } });
        return;
      }
      if (!onlineManager.isOnline()) {
        profilePhotoUploadStore.setState({ state: { status: "offline" } });
        return;
      }
      const presign = await apiClient.post("/uploads/presign", {
        kind: "image", contentType: "image/jpeg", sizeBytes: compressed.fileSize, writeProtocol: "conditional-v1",
      } satisfies UploadsSchemas.PresignRequest, UploadsSchemas.PresignResponseSchema);
      const task = FileSystem.createUploadTask(presign.uploadUrl, compressed.uri, {
        httpMethod: "PUT", uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT, headers: presign.headers,
      }, ({ totalBytesSent, totalBytesExpectedToSend }) => {
        const percent = totalBytesExpectedToSend > 0 ? Math.min(100, Math.floor(100 * totalBytesSent / totalBytesExpectedToSend)) : 0;
        profilePhotoUploadStore.setState({ state: { status: "uploading", uri: compressed.uri, percent } });
      });
      const result = await task.uploadAsync();
      if (!result || result.status < 200 || result.status >= 300) throw new Error("Photo upload failed");
      await setPhoto.mutateAsync({ key: presign.key });
      profilePhotoUploadStore.setState({ state: { status: "idle" } });
      profileNoticeStore.getState().show({ kind: "photoSaved" });
      await discard();
    } catch (error) {
      const status = error instanceof CompressionError ? "unsupported"
        : !onlineManager.isOnline() || (error instanceof ApiError && (error.status === 0 || error.code === "NETWORK_ERROR")) ? "offline" : "failed";
      profilePhotoUploadStore.setState({ state: { status } });
    }
  }

  async function discard() {
    const uri = selected?.compressed?.uri;
    selected = null;
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }

  function cancel() {
    profilePhotoUploadStore.setState({ state: { status: "idle" } });
    void discard();
  }

  async function pick(source: "camera" | "library") {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setCameraDenied(true);
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1,
    };
    try {
      const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) {
        await discard();
        selected = { asset: result.assets[0] };
        await upload();
      }
    } catch {
      profilePhotoUploadStore.setState({ state: { status: "unsupported" } });
    }
  }

  return { state, pick, retry: upload, cancel, cameraDenied, dismissCameraDenied: () => setCameraDenied(false) };
}

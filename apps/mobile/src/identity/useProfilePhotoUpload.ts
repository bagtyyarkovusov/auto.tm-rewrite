import { useState } from "react";
import { create } from "zustand";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { UploadsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../api/client";
import { useSetProfilePhoto } from "../api/identity/useSetProfilePhoto";
import { compressPhoto } from "../listings/uploadStaging/compressor";

import { profileNoticeStore } from "./profileNotice";

type PhotoUploadState = { status: "idle" } | { status: "uploading"; uri: string; percent: number };
// Route dismissal removes observers, not the job or its result.
export const profilePhotoUploadStore = create<{ state: PhotoUploadState }>()(() => ({ state: { status: "idle" } }));

/** Picks, shrinks and uploads one Profile Photo independently of Listing drafts. */
export function useProfilePhotoUpload() {
  const state = profilePhotoUploadStore((store) => store.state);
  const [cameraDenied, setCameraDenied] = useState(false);
  const setPhoto = useSetProfilePhoto();

  async function upload(asset: ImagePicker.ImagePickerAsset) {
    const destination = `${FileSystem.cacheDirectory}profile-photo-${Date.now()}.jpg`;
    profilePhotoUploadStore.setState({ state: { status: "uploading", uri: asset.uri, percent: 0 } });
    const compressed = await compressPhoto(asset.uri, destination, { maxDimension: 512, width: asset.width, height: asset.height });
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
    const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) await upload(result.assets[0]);
  }

  return { state, pick, cameraDenied, dismissCameraDenied: () => setCameraDenied(false) };
}

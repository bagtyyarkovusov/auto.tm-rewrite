import { useCallback, useReducer } from "react";
import type { ListingsSchemas, WizardSchemas } from "@auto-tm/contracts";

import { useEditListing } from "../../api/listings/useEditListing";
import { useAttachMedia } from "../../api/listings/useAttachMedia";
import { useRemoveMedia } from "../../api/listings/useRemoveMedia";
import { useReorderMedia } from "../../api/listings/useReorderMedia";
import type { StagedPhoto } from "../uploadStaging/types";

export type OpState = "pending" | "in_flight" | "succeeded" | "failed";

export class EditSessionError extends Error {
  constructor(
    public readonly opStates: Record<string, OpState>,
    public readonly failedOpId: string,
    public readonly cause: unknown,
  ) {
    super(`Edit session failed at operation ${failedOpId}`);
    this.name = "EditSessionError";
  }
}

interface State {
  status: "idle" | "saving" | "succeeded" | "failed";
  opStates: Record<string, OpState>;
  error: EditSessionError | null;
}

type Action =
  | { type: "INIT_OPS"; opIds: string[] }
  | { type: "OP_START"; opId: string }
  | { type: "OP_SUCCESS"; opId: string }
  | { type: "OP_FAIL"; opId: string; cause: unknown }
  | { type: "ALL_SUCCEEDED" }
  | { type: "RETRY" }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT_OPS": {
      const opStates: Record<string, OpState> = {};
      for (const id of action.opIds) {
        opStates[id] = "pending";
      }
      return {
        status: "saving",
        opStates,
        error: null,
      };
    }
    case "OP_START":
      return {
        ...state,
        opStates: { ...state.opStates, [action.opId]: "in_flight" },
      };
    case "OP_SUCCESS":
      return {
        ...state,
        opStates: { ...state.opStates, [action.opId]: "succeeded" },
      };
    case "OP_FAIL": {
      const nextOpStates: Record<string, OpState> = {
        ...state.opStates,
        [action.opId]: "failed",
      };
      return {
        ...state,
        status: "failed",
        opStates: nextOpStates,
        error: new EditSessionError(nextOpStates, action.opId, action.cause),
      };
    }
    case "ALL_SUCCEEDED":
      return { ...state, status: "succeeded" };
    case "RETRY": {
      const next: Record<string, OpState> = {};
      for (const [id, s] of Object.entries(state.opStates)) {
        next[id] = s === "failed" ? "pending" : s;
      }
      return { ...state, status: "saving", opStates: next, error: null };
    }
    case "RESET":
      return { status: "idle", opStates: {}, error: null };
    default:
      return state;
  }
}

const EDITABLE_FIELDS: (keyof ListingsSchemas.EditListingRequest)[] = [
  "priceAmount",
  "priceCurrency",
  "description",
  "condition",
  "mileageKm",
  "colorId",
  "bodyTypeId",
  "transmissionId",
  "driveTypeId",
  "engineTypeId",
  "enginePower",
  "regionId",
  "cityId",
  "locationText",
  "contactPhone",
  "allowCalls",
  "allowChat",
  "acceptsExchange",
  "installmentAvailable",
];

export function buildFieldsPatch(
  payload: WizardSchemas.WizardDraftPayload,
): ListingsSchemas.EditListingRequest {
  const patch: ListingsSchemas.EditListingRequest = {};
  for (const field of EDITABLE_FIELDS) {
    const value = payload[field as keyof WizardSchemas.WizardDraftPayload];
    if (value !== undefined) {
      (patch as Record<string, unknown>)[field] = value;
    }
  }
  return patch;
}

export interface SaveListingEditOp {
  id: string;
  label: string;
}

export function computeOps(
  payload: WizardSchemas.WizardDraftPayload,
  photos: StagedPhoto[],
  seedMedia: ListingsSchemas.ListingMedia[],
): SaveListingEditOp[] {
  const ops: SaveListingEditOp[] = [];
  const seedMediaIds = new Set(seedMedia.map((m) => m.id));

  // 1. Fields
  const fieldsPatch = buildFieldsPatch(payload);
  if (Object.keys(fieldsPatch).length > 0) {
    ops.push({ id: "fields", label: "Save field changes" });
  }

  // 2. Attach new photos
  const newPhotos = photos.filter(
    (p) => p.key && !seedMediaIds.has(p.photoId),
  );
  for (const photo of newPhotos) {
    ops.push({
      id: `attach:${photo.photoId}`,
      label: `Attach photo ${photo.sortOrder + 1}`,
    });
  }

  // 3. Remove deleted photos
  const queuePhotoIds = new Set(photos.map((p) => p.photoId));
  const removedMediaIds = seedMedia
    .filter((m) => !queuePhotoIds.has(m.id))
    .map((m) => m.id);
  for (const mediaId of removedMediaIds) {
    ops.push({
      id: `remove:${mediaId}`,
      label: "Remove photo",
    });
  }

  // 4. Reorder
  if (photos.length > 0) {
    ops.push({ id: "reorder", label: "Update photo order" });
  }

  return ops;
}

export function opLabel(opId: string): string {
  if (opId === "fields") return "Save field changes";
  if (opId === "reorder") return "Update photo order";
  if (opId.startsWith("attach:")) return "Attach photo";
  if (opId.startsWith("remove:")) return "Remove photo";
  return opId;
}

export function useSaveListingEdit(
  listingId: string,
  payload: WizardSchemas.WizardDraftPayload,
  photos: StagedPhoto[],
  seedMedia: ListingsSchemas.ListingMedia[],
) {
  const [state, dispatch] = useReducer(reducer, {
    status: "idle",
    opStates: {},
    error: null,
  });

  const editListing = useEditListing();
  const attachMedia = useAttachMedia(listingId);
  const removeMedia = useRemoveMedia(listingId);
  const reorderMedia = useReorderMedia(listingId);

  const runOps = useCallback(
    async (initialOpStates: Record<string, OpState>) => {
      const seedMediaIds = new Set(seedMedia.map((m) => m.id));
      const queuePhotoIds = new Set(photos.map((p) => p.photoId));
      const opStates: Record<string, OpState> = { ...initialOpStates };

      const runOp = async (opId: string, fn: () => Promise<unknown>) => {
        if (opStates[opId] === "succeeded") return;
        opStates[opId] = "in_flight";
        dispatch({ type: "OP_START", opId });
        try {
          await fn();
          opStates[opId] = "succeeded";
          dispatch({ type: "OP_SUCCESS", opId });
        } catch (err) {
          opStates[opId] = "failed";
          dispatch({ type: "OP_FAIL", opId, cause: err });
          throw new EditSessionError({ ...opStates }, opId, err);
        }
      };

      const fieldsPatch = buildFieldsPatch(payload);
      if (Object.keys(fieldsPatch).length > 0) {
        await runOp("fields", () =>
          editListing.mutateAsync({ listingId, patch: fieldsPatch }),
        );
      }

      const newPhotos = photos.filter(
        (p) => p.key && !seedMediaIds.has(p.photoId),
      );
      for (const photo of newPhotos) {
        await runOp(`attach:${photo.photoId}`, () =>
          attachMedia.mutateAsync({
            key: photo.key!,
            kind: "image",
            sortOrder: photo.sortOrder,
            width: photo.width,
            height: photo.height,
          }),
        );
      }

      const removedMediaIds = seedMedia
        .filter((m) => !queuePhotoIds.has(m.id))
        .map((m) => m.id);
      for (const mediaId of removedMediaIds) {
        await runOp(`remove:${mediaId}`, () =>
          removeMedia.mutateAsync(mediaId),
        );
      }

      if (photos.length > 0) {
        await runOp("reorder", () =>
          reorderMedia.mutateAsync({
            ordering: photos.map((p, i) => ({
              mediaId: p.photoId,
              sortOrder: i,
            })),
          }),
        );
      }

      dispatch({ type: "ALL_SUCCEEDED" });
    },
    [
      payload,
      photos,
      seedMedia,
      listingId,
      editListing,
      attachMedia,
      removeMedia,
      reorderMedia,
    ],
  );

  const save = useCallback(async () => {
    const opIds = computeOps(payload, photos, seedMedia).map((o) => o.id);
    dispatch({ type: "INIT_OPS", opIds });
    await runOps({});
  }, [payload, photos, seedMedia, runOps]);

  const retry = useCallback(async () => {
    if (state.status !== "failed") return;
    dispatch({ type: "RETRY" });
    await runOps(state.opStates);
  }, [state.status, state.opStates, runOps]);

  return {
    save,
    retry,
    status: state.status,
    opStates: state.opStates,
    error: state.error,
    isPending: state.status === "saving",
  };
}

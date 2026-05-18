import { useCallback, useMemo, useRef, useState } from "react";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { useUpdateDraft } from "../../api/listings/useUpdateDraft";

interface DebouncedFn<TArgs extends unknown[]> {
  (...args: TArgs): void;
  flush?: () => void;
}

function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number,
): DebouncedFn<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const debounced = (...args: TArgs) => {
    lastArgs = args;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
      lastArgs = null;
    }, delay);
  };

  debounced.flush = () => {
    if (timer && lastArgs) {
      clearTimeout(timer);
      fn(...lastArgs);
      timer = null;
      lastArgs = null;
    }
  };

  return debounced;
}

export function useWizardAutosave(draftId: string) {
  const updateDraft = useUpdateDraft();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const pendingPayloadRef = useRef<ListingsSchemas.ListingDraftPayload | null>(null);

  const performSave = useCallback(
    (payload: ListingsSchemas.ListingDraftPayload) => {
      setIsSaving(true);
      setSaveError(null);
      updateDraft.mutate(
        { draftId, payload },
        {
          onSettled: () => {
            setIsSaving(false);
          },
          onError: (err) => {
            setSaveError(err);
          },
        },
      );
    },
    [draftId, updateDraft],
  );

  const debouncedSave = useMemo(
    () =>
      debounce((payload: ListingsSchemas.ListingDraftPayload) => {
        performSave(payload);
      }, 500),
    [performSave],
  );

  const save = useCallback(
    (payload: ListingsSchemas.ListingDraftPayload) => {
      pendingPayloadRef.current = payload;
      setSaveError(null);
      debouncedSave(payload);
    },
    [debouncedSave],
  );

  const forceSave = useCallback(
    async (payload: ListingsSchemas.ListingDraftPayload) => {
      pendingPayloadRef.current = payload;
      debouncedSave.flush?.();
      setIsSaving(true);
      setSaveError(null);

      return new Promise<void>((resolve, reject) => {
        updateDraft.mutate(
          { draftId, payload },
          {
            onSettled: () => {
              setIsSaving(false);
              resolve();
            },
            onError: (err) => {
              setSaveError(err);
              reject(err);
            },
          },
        );
      });
    },
    [draftId, updateDraft, debouncedSave],
  );

  return { save, forceSave, isSaving, saveError };
}

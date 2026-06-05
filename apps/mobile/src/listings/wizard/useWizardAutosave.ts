import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import type { WizardSchemas } from "@auto-tm/contracts";

import { useUpdateDraft } from "../../api/listings/useUpdateDraft";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface DebouncedFn<TArgs extends unknown[]> {
  (...args: TArgs): void;
  cancel?: () => void;
}

function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number,
): DebouncedFn<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: TArgs) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff
const SAVE_TIMEOUT_MS = 10_000;
const SAVED_CLEAR_MS = 2_000;

export function useWizardAutosave(draftId: string | undefined) {
  const updateDraft = useUpdateDraft();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveStatusRef = useRef(saveStatus);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  const retryCountRef = useRef(0);
  const pendingPayloadRef = useRef<WizardSchemas.WizardDraftPayload | null>(
    null,
  );
  const lastSavedPayloadRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const isOnlineRef = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track network status
  useEffect(() => {
    isMountedRef.current = true;
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;
      isOnlineRef.current = online;

      // If we came back online and have a pending save in error state, retry
      if (online && pendingPayloadRef.current && saveStatusRef.current === "error") {
        retryCountRef.current = 0;
        performSave(pendingPayloadRef.current);
      }
    });
    return () => {
      unsub();
      isMountedRef.current = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedClearTimeoutRef.current) clearTimeout(savedClearTimeoutRef.current);
    };
  }, []);

  const clearSaveTimeout = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const clearSavedTimeout = useCallback(() => {
    if (savedClearTimeoutRef.current) {
      clearTimeout(savedClearTimeoutRef.current);
      savedClearTimeoutRef.current = null;
    }
  }, []);

  const performSave = useCallback(
    async (payload: WizardSchemas.WizardDraftPayload): Promise<void> => {
      if (!draftId || draftId.length === 0) return;

      const payloadKey = JSON.stringify(payload);
      if (payloadKey === lastSavedPayloadRef.current) {
        // Already saved this exact payload — nothing to do
        setSaveStatus("saved");
        clearSavedTimeout();
        savedClearTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) setSaveStatus("idle");
        }, SAVED_CLEAR_MS);
        return;
      }

      pendingPayloadRef.current = payload;
      setSaveStatus("saving");
      setSaveError(null);
      clearSaveTimeout();
      clearSavedTimeout();

      saveTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && saveStatusRef.current === "saving") {
          setSaveStatus("error");
          setSaveError("Save timed out. Please retry.");
        }
      }, SAVE_TIMEOUT_MS);

      try {
        await updateDraft.mutateAsync({ draftId, payload });

        if (!isMountedRef.current) return;

        clearSaveTimeout();
        retryCountRef.current = 0;
        pendingPayloadRef.current = null;
        lastSavedPayloadRef.current = payloadKey;
        setSaveStatus("saved");

        savedClearTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) setSaveStatus("idle");
        }, SAVED_CLEAR_MS);
      } catch (err) {
        clearSaveTimeout();
        if (!isMountedRef.current) return;

        const message =
          err instanceof Error ? err.message : "Failed to save draft";

        const isNetworkError =
          !isOnlineRef.current ||
          (err instanceof Error &&
            "code" in err &&
            (err as { code: string }).code === "NETWORK_ERROR");

        if (isNetworkError) {
          setSaveStatus("error");
          setSaveError("No internet connection. Will retry when online.");
          return;
        }

        if (retryCountRef.current < MAX_RETRIES) {
          const delay = RETRY_DELAYS[retryCountRef.current] ?? 4000;
          retryCountRef.current += 1;

          setSaveStatus("saving");
          setSaveError(`Retrying... (${retryCountRef.current}/${MAX_RETRIES})`);

          setTimeout(() => {
            if (isMountedRef.current && pendingPayloadRef.current) {
              void performSaveRef.current(pendingPayloadRef.current);
            }
          }, delay);
        } else {
          retryCountRef.current = 0;
          setSaveStatus("error");
          setSaveError(message);
        }
      }
    },
    [draftId, updateDraft, clearSaveTimeout, clearSavedTimeout],
  );

  // Use a ref so the debounce closure always calls the current performSave
  // without needing to recreate the debounced function when performSave changes.
  const performSaveRef = useRef(performSave);
  performSaveRef.current = performSave;

  const debouncedSave = useMemo(
    () =>
      debounce((payload: WizardSchemas.WizardDraftPayload) => {
        retryCountRef.current = 0;
        void performSaveRef.current(payload);
      }, 500),
    [], // never recreate — stable forever
  );

  const save = useCallback(
    (payload: WizardSchemas.WizardDraftPayload) => {
      pendingPayloadRef.current = payload;
      setSaveError(null);
      debouncedSave(payload);
    },
    [debouncedSave],
  );

  const forceSave = useCallback(
    async (payload: WizardSchemas.WizardDraftPayload): Promise<void> => {
      pendingPayloadRef.current = payload;
      debouncedSave.cancel?.();
      retryCountRef.current = 0;
      await performSave(payload);
    },
    [debouncedSave, performSave],
  );

  const retrySave = useCallback(() => {
    if (pendingPayloadRef.current) {
      retryCountRef.current = 0;
      void performSave(pendingPayloadRef.current);
    }
  }, [performSave]);

  return { save, forceSave, retrySave, saveStatus, saveError };
}

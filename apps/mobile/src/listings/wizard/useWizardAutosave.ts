import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import type { WizardSchemas } from "@auto-tm/contracts";

import { useUpdateDraft } from "../../api/listings/useUpdateDraft";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

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

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff

export function useWizardAutosave(draftId: string | undefined) {
  const updateDraft = useUpdateDraft();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const retryCountRef = useRef(0);
  const pendingPayloadRef = useRef<WizardSchemas.WizardDraftPayload | null>(
    null,
  );
  const isMountedRef = useRef(true);
  const isOnlineRef = useRef(true);

  // Track network status
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;
      isOnlineRef.current = online;

      // If we came back online and have a pending save in error state, retry
      if (online && pendingPayloadRef.current && saveStatus === "error") {
        retryCountRef.current = 0;
        performSave(pendingPayloadRef.current);
      }
    });
    return () => {
      unsub();
      isMountedRef.current = false;
    };
  }, [saveStatus]);

  const performSave = useCallback(
    async (
      payload: WizardSchemas.WizardDraftPayload,
      isRetry = false,
    ): Promise<void> => {
      if (!draftId || draftId.length === 0) return;

      pendingPayloadRef.current = payload;
      setSaveStatus("saving");
      setSaveError(null);

      try {
        await updateDraft.mutateAsync({ draftId, payload });

        if (!isMountedRef.current) return;

        retryCountRef.current = 0;
        pendingPayloadRef.current = null;
        setSaveStatus("idle");
      } catch (err) {
        if (!isMountedRef.current) return;

        const message =
          err instanceof Error ? err.message : "Failed to save draft";

        if (!isOnlineRef.current) {
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
              void performSave(pendingPayloadRef.current, true);
            }
          }, delay);
        } else {
          retryCountRef.current = 0;
          setSaveStatus("error");
          setSaveError(message);
        }
      }
    },
    [draftId, updateDraft],
  );

  const debouncedSave = useMemo(
    () =>
      debounce((payload: WizardSchemas.WizardDraftPayload) => {
        retryCountRef.current = 0;
        void performSave(payload);
      }, 500),
    [performSave],
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
      debouncedSave.flush?.();
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

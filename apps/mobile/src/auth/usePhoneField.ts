import { useMemo, useState } from "react";

import {
  displayPhoneFromCanonical,
  formatLocalPhone,
  normalizeTmPhone,
  validateTmPhone,
} from "./phone";

type Translate = (key: string) => string;

/**
 * State for a `+993` phone input: formatted display value, the canonical
 * phone once valid, and helper/error copy that appears only after blur.
 */
export function usePhoneField(t: Translate, initialPhone?: string) {
  const [display, setDisplay] = useState(
    initialPhone ? displayPhoneFromCanonical(initialPhone) : "",
  );
  const [touched, setTouched] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const canonicalPhone = useMemo(() => normalizeTmPhone(display), [display]);
  const validation = validateTmPhone(display);

  const helperText = useMemo(() => {
    if (requestError) return requestError;
    if (!touched || validation === null) return t("phoneInputHelper");

    return validation === "incomplete"
      ? t("phoneIncompleteError")
      : t("phoneFormatError");
  }, [t, validation, requestError, touched]);

  const showError = useMemo(() => {
    if (requestError) return true;
    if (!touched) return false;
    const localDigits = display.replace(/\D/g, "");
    if (localDigits.length >= 8) return validation !== null;
    return validation === "format";
  }, [requestError, touched, display, validation]);

  function onChangeText(value: string) {
    setDisplay(formatLocalPhone(value));
    setRequestError(null);
  }

  return {
    display,
    canonicalPhone,
    helperText,
    showError,
    onChangeText,
    touch: () => setTouched(true),
    setRequestError,
  };
}

const TM_COUNTRY_CODE = "+993";
const LOCAL_PHONE_LENGTH = 8;

export function extractLocalPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("993")) {
    digits = digits.slice(3);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, LOCAL_PHONE_LENGTH);
}

export function formatLocalPhone(value: string): string {
  const digits = extractLocalPhoneDigits(value);
  const first = digits.slice(0, 2);
  const second = digits.slice(2, 4);
  const third = digits.slice(4, 6);
  const fourth = digits.slice(6, 8);

  let formatted = first;
  if (second) formatted += ` ${second}`;
  if (third) formatted += `-${third}`;
  if (fourth) formatted += `-${fourth}`;

  return formatted;
}

export function normalizeTmPhone(value: string): string | null {
  const localDigits = extractLocalPhoneDigits(value);

  if (!/^[67]\d{7}$/.test(localDigits)) {
    return null;
  }

  return `${TM_COUNTRY_CODE}${localDigits}`;
}

export function validateTmPhone(value: string): string | null {
  const localDigits = extractLocalPhoneDigits(value);

  if (localDigits.length === 0) {
    return null;
  }

  if (!/^[67]/.test(localDigits)) {
    return "format";
  }

  if (localDigits.length < LOCAL_PHONE_LENGTH) {
    return "incomplete";
  }

  return normalizeTmPhone(value) ? null : "format";
}

export function displayPhoneFromCanonical(phone: string): string {
  return formatLocalPhone(phone);
}

export function maskTmPhone(phone: string): string {
  const localDigits = extractLocalPhoneDigits(phone);

  if (localDigits.length !== LOCAL_PHONE_LENGTH) {
    return phone;
  }

  return `${TM_COUNTRY_CODE} ${localDigits.slice(0, 2)} XX-XX-${localDigits.slice(6, 8)}`;
}

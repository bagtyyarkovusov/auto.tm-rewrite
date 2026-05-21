export const locales = ["ru", "tk", "en"] as const;
export type Locale = (typeof locales)[number];

type AuthCopy = {
  close: string;
  back: string;
  loading: string;
  phoneTitle: string;
  phoneHelper: string;
  phoneLabel: string;
  phonePlaceholder: string;
  phoneInputHelper: string;
  phoneFormatError: string;
  phoneIncompleteError: string;
  getCode: string;
  legalPrefix: string;
  terms: string;
  legalAnd: string;
  privacy: string;
  requestFailed: string;
  offline: string;
  otpTitle: string;
  otpSent: (phone: string) => string;
  changeNumber: string;
  wrongCode: string;
  expiredCode: string;
  lockedCode: string;
  usedCode: string;
  rateLimitedCode: string;
  resendIn: (seconds: number) => string;
  resendCode: string;
  verifyFailed: string;
  devCode: (code: string) => string;
  signedIn: string;
};

export const authCopy: Record<Locale, AuthCopy> = {
  ru: {
    close: "Закрыть",
    back: "Назад",
    loading: "Подождите...",
    phoneTitle: "Введите номер телефона",
    phoneHelper: "Мы отправим код по SMS.",
    phoneLabel: "Номер телефона",
    phonePlaceholder: "6X XX-XX-XX",
    phoneInputHelper: "Введите мобильный номер Туркменистана.",
    phoneFormatError: "Введите номер в формате +993 6X XX-XX-XX.",
    phoneIncompleteError: "Введите полный номер телефона.",
    getCode: "Получить код",
    legalPrefix: "Продолжая, вы соглашаетесь с",
    terms: "Условиями",
    legalAnd: "и",
    privacy: "Политикой конфиденциальности",
    requestFailed: "Не удалось отправить код. Попробуйте еще раз.",
    offline: "Нет подключения к интернету. Попробуйте позже.",
    otpTitle: "Введите код",
    otpSent: (phone) => `Код отправлен на ${phone}`,
    changeNumber: "Изменить номер",
    wrongCode: "Неверный код. Попробуйте еще раз.",
    expiredCode: "Код истек. Запросите новый.",
    lockedCode: "Слишком много попыток. Запросите новый код.",
    usedCode: "Код уже использован. Запросите новый.",
    rateLimitedCode: "Слишком много запросов. Подождите немного.",
    resendIn: (seconds) => `Отправить код снова через ${seconds} с`,
    resendCode: "Отправить код снова",
    verifyFailed: "Не удалось проверить код. Попробуйте еще раз.",
    devCode: (code) => `Dev code: ${code}`,
    signedIn: "Вы вошли",
  },
  tk: {
    close: "Ýap",
    back: "Yza",
    loading: "Garaşyň...",
    phoneTitle: "Telefon belgiňizi giriziň",
    phoneHelper: "Kody SMS bilen ibereris.",
    phoneLabel: "Telefon belgisi",
    phonePlaceholder: "6X XX-XX-XX",
    phoneInputHelper: "Türkmenistanyň mobil belgisini giriziň.",
    phoneFormatError: "Belgini +993 6X XX-XX-XX görnüşinde giriziň.",
    phoneIncompleteError: "Telefon belgisini doly giriziň.",
    getCode: "Kody almak",
    legalPrefix: "Dowam etmek bilen siz",
    terms: "Ulanyş şertleri",
    legalAnd: "we",
    privacy: "Gizlinlik syýasaty",
    requestFailed: "Kody ibermek başartmady. Täzeden synanyşyň.",
    offline: "Internet baglanyşygy ýok. Soňrak synanyşyň.",
    otpTitle: "Kody giriziň",
    otpSent: (phone) => `Kod ${phone} belgä iberildi`,
    changeNumber: "Belgini üýtget",
    wrongCode: "Kod nädogry. Täzeden synanyşyň.",
    expiredCode: "Koduň wagty gutardy. Täze kod soraň.",
    lockedCode: "Synanyşyk köpeldi. Täze kod soraň.",
    usedCode: "Kod eýýäm ulanyldy. Täze kod soraň.",
    rateLimitedCode: "Sorag köp. Biraz garaşyň.",
    resendIn: (seconds) => `Kody ${seconds} s soň täzeden iber`,
    resendCode: "Kody täzeden iber",
    verifyFailed: "Kody barlamak başartmady. Täzeden synanyşyň.",
    devCode: (code) => `Dev code: ${code}`,
    signedIn: "Giriş edildi",
  },
  en: {
    close: "Close",
    back: "Back",
    loading: "Please wait...",
    phoneTitle: "Enter your phone number",
    phoneHelper: "We'll send a code by SMS.",
    phoneLabel: "Phone number",
    phonePlaceholder: "6X XX-XX-XX",
    phoneInputHelper: "Enter a Turkmenistan mobile number.",
    phoneFormatError: "Enter a number in the format +993 6X XX-XX-XX.",
    phoneIncompleteError: "Enter the full phone number.",
    getCode: "Get code",
    legalPrefix: "By continuing, you agree to the",
    terms: "Terms",
    legalAnd: "and",
    privacy: "Privacy Policy",
    requestFailed: "Could not send the code. Try again.",
    offline: "No internet connection. Try again when you are online.",
    otpTitle: "Enter the code",
    otpSent: (phone) => `Code sent to ${phone}`,
    changeNumber: "Change number",
    wrongCode: "Wrong code. Try again.",
    expiredCode: "Code expired. Request a new one.",
    lockedCode: "Too many attempts. Request a new code.",
    usedCode: "Code already used. Request a new one.",
    rateLimitedCode: "Too many requests. Please wait a moment.",
    resendIn: (seconds) => `Resend code in ${seconds}s`,
    resendCode: "Resend code",
    verifyFailed: "Could not verify the code. Try again.",
    devCode: (code) => `Dev code: ${code}`,
    signedIn: "Signed in",
  },
};

export function resolveLocale(value: unknown): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : "ru";
}

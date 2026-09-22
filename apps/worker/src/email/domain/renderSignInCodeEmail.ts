import type { OutgoingEmail } from "./EmailSenderPort";
import {
  EMAIL_SIGN_IN_CODE_EXPIRY_MINUTES as EXPIRY,
  type EmailLocale,
  type SignInCodePurpose,
} from "./types";

export interface SignInCodeEmailInput {
  to: string;
  code: string;
  locale: EmailLocale;
  purpose: SignInCodePurpose;
}

interface Copy {
  subject: (code: string) => string;
  lead: Record<SignInCodePurpose, string>;
  expiry: string;
  neverAsk: string;
  ignore: string;
}

// ADR-0055: names only AutoTM, code in the subject, no links, states the
// expiry, and says AutoTM will never ask for the code.
const COPY: Record<EmailLocale, Copy> = {
  en: {
    subject: (code) => `${code} is your AutoTM code`,
    lead: {
      "sign-in": "Your code to sign in to AutoTM:",
      "sign-in-method": "Your code to confirm this email address in AutoTM:",
      "account-deletion": "Your code to confirm deleting your AutoTM account:",
    },
    expiry: `The code expires in ${EXPIRY} minutes.`,
    neverAsk: "AutoTM will never ask you for this code. Don't share it with anyone.",
    ignore: "If you didn't request this code, ignore this email.",
  },
  ru: {
    subject: (code) => `${code} — ваш код AutoTM`,
    lead: {
      "sign-in": "Ваш код для входа в AutoTM:",
      "sign-in-method": "Ваш код для подтверждения этого адреса в AutoTM:",
      "account-deletion": "Ваш код для подтверждения удаления аккаунта AutoTM:",
    },
    expiry: `Код действует ${EXPIRY} минут.`,
    neverAsk: "AutoTM никогда не попросит у вас этот код. Никому его не сообщайте.",
    ignore: "Если вы не запрашивали код, просто проигнорируйте это письмо.",
  },
  tk: {
    subject: (code) => `${code} — AutoTM koduňyz`,
    lead: {
      "sign-in": "AutoTM-e girmek üçin koduňyz:",
      "sign-in-method": "Bu salgyny AutoTM-de tassyklamak üçin koduňyz:",
      "account-deletion": "AutoTM hasabyňyzy pozmagy tassyklamak üçin koduňyz:",
    },
    expiry: `Kod ${EXPIRY} minudyň dowamynda hereket edýär.`,
    neverAsk: "AutoTM bu kody sizden hiç haçan soramaz. Ony hiç kime bermäň.",
    ignore: "Bu kody siz soramadyk bolsaňyz, bu haty äsgermäň.",
  },
};

export function renderSignInCodeEmail(input: SignInCodeEmailInput): OutgoingEmail {
  const copy = COPY[input.locale];
  const lead = copy.lead[input.purpose];
  const lines = [copy.expiry, copy.neverAsk, copy.ignore];

  const text = [lead, "", input.code, "", ...lines, "", "AutoTM"].join("\n");
  // Every interpolated value is fixed copy or a validated 6-digit code, so
  // nothing here needs HTML escaping.
  const html = [
    `<p>${lead}</p>`,
    `<p style="font-size:28px;font-weight:bold;letter-spacing:4px">${input.code}</p>`,
    ...lines.map((line) => `<p>${line}</p>`),
    "<p>AutoTM</p>",
  ].join("\n");

  return { to: input.to, subject: copy.subject(input.code), text, html };
}

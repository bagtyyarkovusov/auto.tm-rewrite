export interface EmailCodeSenderPort {
  enqueue(input: {
    requestId: string;
    email: string;
    code: string;
    locale: "ru" | "tk" | "en";
    /**
     * The three email flows only. A `listing-contact-phone` code goes by SMS
     * and has no email wording (ADR-0081).
     */
    purpose: "sign-in" | "sign-in-method" | "account-deletion";
  }): Promise<void>;
}

export const EMAIL_CODE_SENDER_PORT = Symbol("EmailCodeSenderPort");

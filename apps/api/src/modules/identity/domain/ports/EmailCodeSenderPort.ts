export interface EmailCodeSenderPort {
  enqueue(input: {
    requestId: string;
    email: string;
    code: string;
    locale: "ru" | "tk" | "en";
    purpose: "sign-in" | "sign-in-method" | "account-deletion";
  }): Promise<void>;
}

export const EMAIL_CODE_SENDER_PORT = Symbol("EmailCodeSenderPort");

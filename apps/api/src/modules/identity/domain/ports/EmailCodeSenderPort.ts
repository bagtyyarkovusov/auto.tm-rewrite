export interface EmailCodeSenderPort {
  enqueue(input: {
    requestId: string;
    email: string;
    code: string;
    locale: "ru" | "tk" | "en";
  }): Promise<void>;
}

export const EMAIL_CODE_SENDER_PORT = Symbol("EmailCodeSenderPort");

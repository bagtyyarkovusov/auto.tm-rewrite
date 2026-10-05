import type {
  ContactPhoneCodePort,
  ContactPhoneCodeSent,
} from "../../../identity/identity.public";

/** Records code requests and confirmations; a test sets `confirmError` to refuse a code. */
export class FakeContactPhoneCodes implements ContactPhoneCodePort {
  requests: Array<Parameters<ContactPhoneCodePort["requestCode"]>[0]> = [];
  confirmations: Array<Parameters<ContactPhoneCodePort["confirmCode"]>[0]> = [];
  sent: ContactPhoneCodeSent = {
    requestId: "11111111-1111-4111-8111-111111111111",
    resendInSeconds: 60,
  };
  confirmError: Error | undefined;

  async requestCode(
    input: Parameters<ContactPhoneCodePort["requestCode"]>[0],
  ): Promise<ContactPhoneCodeSent> {
    this.requests.push(input);
    return this.sent;
  }

  async confirmCode(input: Parameters<ContactPhoneCodePort["confirmCode"]>[0]): Promise<void> {
    this.confirmations.push(input);
    if (this.confirmError) throw this.confirmError;
  }
}

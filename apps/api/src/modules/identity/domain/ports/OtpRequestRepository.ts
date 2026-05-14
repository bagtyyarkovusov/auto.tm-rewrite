import type { OtpRequest } from "../OtpRequest";

export interface OtpRequestRepository {
  create(input: {
    phone: string;
    codeHash: string;
    expiresAt: Date;
    userId: string | null;
    ip: string;
  }): Promise<OtpRequest>;

  findById(id: string): Promise<OtpRequest | null>;

  countByPhoneSince(phone: string, since: Date): Promise<number>;

  countByIpSince(ip: string, since: Date): Promise<number>;

  findLatestByPhone(phone: string): Promise<OtpRequest | null>;
}

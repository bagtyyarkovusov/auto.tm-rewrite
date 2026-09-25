import type { SignInCodeChannel } from "../types";
import type { User } from "../User";

export interface SignInMethodRepository {
  findByPhone(phone: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  replaceSignInMethod(input: {
    userId: string;
    channel: SignInCodeChannel;
    destination: string;
    verifiedAt: Date;
  }): Promise<User>;
}

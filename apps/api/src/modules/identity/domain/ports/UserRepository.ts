import type { User } from "../User";

export interface UserRepository {
  findByPhone(phone: string): Promise<User | null>;
  create(input: { phone: string }): Promise<User>;
}

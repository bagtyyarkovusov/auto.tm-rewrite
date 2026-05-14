import type { User } from "../User";

export interface UserRepository {
  findByPhone(phone: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: { phone: string }): Promise<User>;
  delete(id: string): Promise<void>;
}

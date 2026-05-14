import { Injectable } from "@nestjs/common";
import { hash, compare } from "bcryptjs";
import type { PasswordHasherPort } from "../domain/ports/PasswordHasherPort";

@Injectable()
export class BcryptHasherAdapter implements PasswordHasherPort {
  async hash(plaintext: string): Promise<string> {
    return hash(plaintext, 10);
  }

  async compare(plaintext: string, hashed: string): Promise<boolean> {
    return compare(plaintext, hashed);
  }
}

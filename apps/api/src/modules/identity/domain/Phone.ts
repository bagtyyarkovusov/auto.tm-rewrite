const TM_MOBILE_RE = /^\+993[67]\d{7}$/;

export class Phone {
  private constructor(readonly value: string) {}

  static create(raw: string): Phone {
    if (!TM_MOBILE_RE.test(raw)) {
      throw new Error("Phone must be +993[6-7]XXXXXXX (TM mobile)");
    }
    return new Phone(raw);
  }

  equals(other: Phone): boolean {
    return this.value === other.value;
  }
}

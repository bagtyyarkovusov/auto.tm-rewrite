import { Inject, Injectable } from "@nestjs/common";
import type { CatalogSchemas } from "@auto-tm/contracts";

import type { Transmission } from "../domain/Transmission";
import {
  TRANSMISSION_REPOSITORY,
  type TransmissionRepository,
} from "../domain/ports/TransmissionRepository";

export interface ListTransmissionsInput {
  locale: "tk" | "ru" | "en";
}

export interface ListTransmissionsResult {
  items: CatalogSchemas.TransmissionSummary[];
}

@Injectable()
export class ListTransmissions {
  constructor(
    @Inject(TRANSMISSION_REPOSITORY)
    private readonly transmissions: TransmissionRepository,
  ) {}

  async execute(input: ListTransmissionsInput): Promise<ListTransmissionsResult> {
    const items = await this.transmissions.listTransmissions(input);
    return {
      items: items.map((t) => toTransmissionSummary(t, input.locale)),
    };
  }
}

function toTransmissionSummary(
  transmission: Transmission,
  locale: "tk" | "ru" | "en",
): CatalogSchemas.TransmissionSummary {
  const name = getName(transmission, locale);
  if (name) return { id: transmission.id, name };

  const fallback = transmission.nameEn || transmission.nameRu || transmission.nameTk;
  const fallbackLocale = transmission.nameEn
    ? "en"
    : transmission.nameRu
      ? "ru"
      : "tk";
  return {
    id: transmission.id,
    name: fallback,
    localeFallback: fallbackLocale,
  };
}

function getName(
  transmission: Transmission,
  locale: "tk" | "ru" | "en",
): string {
  switch (locale) {
    case "tk":
      return transmission.nameTk;
    case "ru":
      return transmission.nameRu;
    case "en":
      return transmission.nameEn;
  }
}

import { Inject, Injectable } from "@nestjs/common";
import type { CatalogSchemas } from "@auto-tm/contracts";

import type { DriveType } from "../domain/DriveType";
import {
  DRIVE_TYPE_REPOSITORY,
  type DriveTypeRepository,
} from "../domain/ports/DriveTypeRepository";

export interface ListDriveTypesInput {
  locale: "tk" | "ru" | "en";
}

export interface ListDriveTypesResult {
  items: CatalogSchemas.DriveTypeSummary[];
}

@Injectable()
export class ListDriveTypes {
  constructor(
    @Inject(DRIVE_TYPE_REPOSITORY)
    private readonly driveTypes: DriveTypeRepository,
  ) {}

  async execute(input: ListDriveTypesInput): Promise<ListDriveTypesResult> {
    const items = await this.driveTypes.listDriveTypes(input);
    return {
      items: items.map((dt) => toDriveTypeSummary(dt, input.locale)),
    };
  }
}

function toDriveTypeSummary(
  driveType: DriveType,
  locale: "tk" | "ru" | "en",
): CatalogSchemas.DriveTypeSummary {
  const name = getName(driveType, locale);
  if (name) return { id: driveType.id, name };

  const fallback = driveType.nameEn || driveType.nameRu || driveType.nameTk;
  const fallbackLocale = driveType.nameEn
    ? "en"
    : driveType.nameRu
      ? "ru"
      : "tk";
  return {
    id: driveType.id,
    name: fallback,
    localeFallback: fallbackLocale,
  };
}

function getName(
  driveType: DriveType,
  locale: "tk" | "ru" | "en",
): string {
  switch (locale) {
    case "tk":
      return driveType.nameTk;
    case "ru":
      return driveType.nameRu;
    case "en":
      return driveType.nameEn;
  }
}

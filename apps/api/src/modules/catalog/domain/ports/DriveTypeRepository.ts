import type { DriveType } from "../DriveType";

export interface DriveTypeRepository {
  listDriveTypes(opts: {
    locale: "tk" | "ru" | "en";
  }): Promise<DriveType[]>;

  getDriveTypeById(id: string): Promise<DriveType | null>;
}

export const DRIVE_TYPE_REPOSITORY = Symbol("DriveTypeRepository");

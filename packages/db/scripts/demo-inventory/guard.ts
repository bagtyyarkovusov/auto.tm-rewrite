export type DemoInventoryMode = "seed" | "remove";

export interface DemoInventoryTarget {
  databaseUrl: string;
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey: string;
  minioRegion: string;
}

export function assertDemoInventoryTarget(
  env: Record<string, string | undefined>,
  _mode: DemoInventoryMode,
): DemoInventoryTarget {
  return {
    databaseUrl: env["DATABASE_URL"] ?? "",
    minioEndpoint: env["MINIO_ENDPOINT"] ?? "",
    minioAccessKey: env["MINIO_ACCESS_KEY"] ?? "",
    minioSecretKey: env["MINIO_SECRET_KEY"] ?? "",
    minioRegion: env["MINIO_REGION"] ?? "us-east-1",
  };
}

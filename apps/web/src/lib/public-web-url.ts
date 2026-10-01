export function publicWebUrl(path: string): string {
  const baseUrl = process.env["WEB_BASE_URL"] ??
    (process.env["RAILWAY_PUBLIC_DOMAIN"]
      ? `https://${process.env["RAILWAY_PUBLIC_DOMAIN"]}`
      : "http://localhost:3002");
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

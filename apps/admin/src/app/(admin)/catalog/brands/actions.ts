"use server";

import { CatalogSchemas } from "@auto-tm/contracts";

import { apiFetch, ApiError } from "@/lib/api-client";

type BrandSummary = CatalogSchemas.BrandSummary;
type BrandSummaryListResponse = CatalogSchemas.BrandSummaryListResponse;
type SetBrandLogoResponse = CatalogSchemas.SetBrandLogoResponse;

export type BrandLogoActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const MAX_PAGES = 20;

const REJECTION_MESSAGES: Record<string, string> = {
  LOGO_UNSUPPORTED_TYPE: "Загрузите файл SVG, PNG или WebP.",
  LOGO_TOO_LARGE: "Файл больше 200 КБ.",
  LOGO_EMPTY: "Файл пустой.",
  LOGO_UNREADABLE: "Файл не читается как изображение.",
  LOGO_TYPE_MISMATCH: "Содержимое файла не совпадает с его типом.",
  LOGO_NOT_SQUARE: "Логотип должен быть почти квадратным (стороны не больше 1:1,25).",
  LOGO_UNSAFE_SVG:
    "SVG содержит скрипты, обработчики событий, внешние ссылки или встроенное содержимое.",
};

function toError(err: unknown): { ok: false; error: string } {
  if (err instanceof ApiError) {
    const reason = (err.responseBody as { details?: { reason?: string } } | undefined)?.details
      ?.reason;
    if (reason && REJECTION_MESSAGES[reason]) {
      return { ok: false, error: REJECTION_MESSAGES[reason] };
    }
    if (err.status === 403) return { ok: false, error: "Недостаточно прав." };
    if (err.status === 404) return { ok: false, error: "Бренд не найден." };
    return { ok: false, error: err.message };
  }
  return { ok: false, error: "Неизвестная ошибка. Попробуйте позже." };
}

/** Every brand, following the catalog cursor until the last page. */
export async function listAllBrands(): Promise<BrandLogoActionResult<BrandSummary[]>> {
  const brands: BrandSummary[] = [];
  let cursor: string | null = null;
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({ locale: "ru", limit: "500" });
      if (cursor) params.set("cursor", cursor);
      const data: BrandSummaryListResponse = await apiFetch<BrandSummaryListResponse>(
        `/catalog/brands?${params.toString()}`,
      );
      brands.push(...data.items);
      if (!data.hasMore || !data.nextCursor) break;
      cursor = data.nextCursor;
    }
    return { ok: true, data: brands };
  } catch (err) {
    return toError(err);
  }
}

export async function uploadBrandLogo(
  brandId: string,
  formData: FormData,
): Promise<BrandLogoActionResult<SetBrandLogoResponse>> {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Выберите файл логотипа." };
  }
  if (!CatalogSchemas.BrandLogoContentTypeSchema.safeParse(file.type).success) {
    return { ok: false, error: REJECTION_MESSAGES["LOGO_UNSUPPORTED_TYPE"] as string };
  }
  if (file.size > CatalogSchemas.BRAND_LOGO_MAX_BYTES) {
    return { ok: false, error: REJECTION_MESSAGES["LOGO_TOO_LARGE"] as string };
  }

  try {
    const dataBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const data = await apiFetch<SetBrandLogoResponse>(
      `/admin/catalog/brands/${encodeURIComponent(brandId)}/logo`,
      { method: "PUT", body: { contentType: file.type, dataBase64 } },
    );
    return { ok: true, data };
  } catch (err) {
    return toError(err);
  }
}

export async function removeBrandLogo(
  brandId: string,
): Promise<BrandLogoActionResult<{ success: boolean }>> {
  try {
    const data = await apiFetch<{ success: boolean }>(
      `/admin/catalog/brands/${encodeURIComponent(brandId)}/logo`,
      { method: "DELETE" },
    );
    return { ok: true, data };
  } catch (err) {
    return toError(err);
  }
}

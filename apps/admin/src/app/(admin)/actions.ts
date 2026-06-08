"use server";

import type { AdminSchemas } from "@auto-tm/contracts";

import { apiFetch, ApiError } from "@/lib/api-client";

type ListReportsResponse = AdminSchemas.ListReportsResponse;
type GetReportDetailResponse = AdminSchemas.GetReportDetailResponse;
type DismissReportResponse = AdminSchemas.DismissReportResponse;
type BanListingResponse = AdminSchemas.BanListingResponse;
type UnbanListingResponse = AdminSchemas.UnbanListingResponse;
type SuspendUserResponse = AdminSchemas.SuspendUserResponse;
type UnsuspendUserResponse = AdminSchemas.UnsuspendUserResponse;
type ListAuditEntriesResponse = AdminSchemas.ListAuditEntriesResponse;

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; details?: unknown };

function handleApiError(err: unknown): ActionResult<never> {
  if (err instanceof ApiError) {
    return {
      ok: false,
      error: err.message,
      code: err.code,
      details: err.responseBody,
    };
  }
  return { ok: false, error: "Неизвестная ошибка. Попробуйте позже." };
}

// ─── Reports ───

export async function listReports(params: {
  status?: string;
  targetType?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<ListReportsResponse>> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.targetType) searchParams.set("targetType", params.targetType);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));

  try {
    const data = await apiFetch<ListReportsResponse>(
      `/admin/reports?${searchParams.toString()}`,
    );
    return { ok: true, data };
  } catch (err) {
    return handleApiError(err);
  }
}

export async function getReportDetail(
  id: string,
): Promise<ActionResult<GetReportDetailResponse>> {
  try {
    const data = await apiFetch<GetReportDetailResponse>(`/admin/reports/${id}`);
    return { ok: true, data };
  } catch (err) {
    return handleApiError(err);
  }
}

export async function dismissReport(
  id: string,
  reason: string,
): Promise<ActionResult<DismissReportResponse>> {
  try {
    const data = await apiFetch<DismissReportResponse>(
      `/admin/reports/${id}/dismiss`,
      {
        method: "POST",
        body: { reason } as unknown,
      },
    );
    return { ok: true, data };
  } catch (err) {
    return handleApiError(err);
  }
}

// ─── Listings ───

export async function banListing(
  id: string,
  reason: string,
  reportId?: string,
): Promise<ActionResult<BanListingResponse>> {
  try {
    const data = await apiFetch<BanListingResponse>(
      `/admin/listings/${id}/ban`,
      {
        method: "POST",
        body: { reason, reportId } as unknown,
      },
    );
    return { ok: true, data };
  } catch (err) {
    return handleApiError(err);
  }
}

export async function unbanListing(
  id: string,
  reason: string,
): Promise<ActionResult<UnbanListingResponse>> {
  try {
    const data = await apiFetch<UnbanListingResponse>(
      `/admin/listings/${id}/unban`,
      {
        method: "POST",
        body: { reason } as unknown,
      },
    );
    return { ok: true, data };
  } catch (err) {
    return handleApiError(err);
  }
}

// ─── Users ───

export async function suspendUser(
  id: string,
  reason: string,
  reportId?: string,
): Promise<ActionResult<SuspendUserResponse>> {
  try {
    const data = await apiFetch<SuspendUserResponse>(
      `/admin/users/${id}/suspend`,
      {
        method: "POST",
        body: { reason, reportId } as unknown,
      },
    );
    return { ok: true, data };
  } catch (err) {
    return handleApiError(err);
  }
}

export async function unsuspendUser(
  id: string,
  reason: string,
): Promise<ActionResult<UnsuspendUserResponse>> {
  try {
    const data = await apiFetch<UnsuspendUserResponse>(
      `/admin/users/${id}/unsuspend`,
      {
        method: "POST",
        body: { reason } as unknown,
      },
    );
    return { ok: true, data };
  } catch (err) {
    return handleApiError(err);
  }
}

// ─── Audit ───

export async function listAuditEntries(params: {
  action?: string;
  targetType?: string;
  targetId?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<ListAuditEntriesResponse>> {
  const searchParams = new URLSearchParams();
  if (params.action) searchParams.set("action", params.action);
  if (params.targetType) searchParams.set("targetType", params.targetType);
  if (params.targetId) searchParams.set("targetId", params.targetId);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));

  try {
    const data = await apiFetch<ListAuditEntriesResponse>(
      `/admin/audit?${searchParams.toString()}`,
    );
    return { ok: true, data };
  } catch (err) {
    return handleApiError(err);
  }
}

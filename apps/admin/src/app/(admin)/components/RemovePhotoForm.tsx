"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@auto-tm/ui/components";

import { removeUserPhoto } from "../actions";

interface RemovePhotoFormProps {
  reportId: string;
  targetId: string;
}

export function RemovePhotoForm({ reportId, targetId }: RemovePhotoFormProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length > 1000) {
      setError("Укажите причину (1–1000 символов).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await removeUserPhoto(targetId, trimmed, reportId);
      if (!result.ok) {
        const details = (result.details as { details?: { reason?: string } } | undefined)?.details;
        const errors: Record<string, string> = {
          REPORT_ALREADY_RESOLVED: "Жалоба уже обработана другим администратором. Страница обновлена.",
          MODERATION_TARGET_STATE_CONFLICT: "Состояние цели изменилось. Страница обновлена.",
          REPORT_TARGET_NOT_ACTIONABLE: "Цель больше не доступна для действия. Страница обновлена.",
          FEATURE_DISABLED: "Действие временно недоступно.",
        };
        setError(errors[details?.reason ?? ""] ?? result.error);
        router.refresh();
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  if (success) {
    return <p role="status" className="text-sm text-green-700">Фото удалено.</p>;
  }

  if (!confirming) {
    return <Button variant="destructive" onClick={() => setConfirming(true)}>Удалить фото</Button>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm">Удалить фото профиля и обработать жалобу?</p>
      <div>
        <label htmlFor="reason-remove-photo" className="text-xs font-medium text-neutral-600">
          Причина действия
        </label>
        <Input
          id="reason-remove-photo"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Обязательно: укажите причину..."
          disabled={isPending}
          maxLength={1000}
          className="mt-1"
        />
      </div>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={isPending}>
          {isPending ? "Обработка..." : "Подтвердить удаление"}
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => {
          setConfirming(false);
          setReason("");
          setError(null);
        }}>Отмена</Button>
      </div>
    </form>
  );
}

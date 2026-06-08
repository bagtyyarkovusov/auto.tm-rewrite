import Link from "next/link";

import { DirectActionForm } from "../../components/DirectActionForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingActionPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch the first pending report for this listing to show context, if any
  // For direct action pages we just show current state + action form
  // We don't have a dedicated "get listing admin state" endpoint, so we try
  // to infer from any report detail that targets this listing.
  // If no report exists, we still render the action page.

  // Since there's no direct listing admin GET endpoint, we render the form
  // and let the server action handle state validation.
  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/reports" className="text-brand-600 hover:underline text-sm">
          ← Назад к очереди
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Действия с объявлением</h1>
      <p className="text-sm text-neutral-500 mb-6">ID: {id}</p>

      <div className="space-y-6">
        <div className="rounded-md border bg-surface p-4">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Заблокировать объявление
          </h2>
          <p className="text-xs text-neutral-500 mb-3">
            Объявление будет скрыто из публичного доступа. Новые сообщения и контакты будут заблокированы. Существующие переписки останутся доступными.
          </p>
          <DirectActionForm
            actionType="ban"
            targetId={id}
          />
        </div>

        <div className="rounded-md border bg-surface p-4">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Разблокировать объявление
          </h2>
          <p className="text-xs text-neutral-500 mb-3">
            Объявление будет восстановлено в статус active. Жалобы автоматически не закрываются.
          </p>
          <DirectActionForm
            actionType="unban"
            targetId={id}
          />
        </div>
      </div>
    </div>
  );
}

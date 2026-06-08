import Link from "next/link";

import { DirectActionForm } from "../../components/DirectActionForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserActionPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/reports" className="text-brand-600 hover:underline text-sm">
          ← Назад к очереди
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Действия с пользователем</h1>
      <p className="text-sm text-neutral-500 mb-6">ID: {id}</p>

      <div className="space-y-6">
        <div className="rounded-md border bg-surface p-4">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Заблокировать пользователя
          </h2>
          <p className="text-xs text-neutral-500 mb-3">
            Пользователь не сможет создавать объявления, отправлять сообщения или совершать другие действия. Существующие переписки останутся доступными.
          </p>
          <DirectActionForm
            actionType="suspend"
            targetId={id}
          />
        </div>

        <div className="rounded-md border bg-surface p-4">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Разблокировать пользователя
          </h2>
          <p className="text-xs text-neutral-500 mb-3">
            Пользователь будет восстановлен. История блокировки сохранится в аудите.
          </p>
          <DirectActionForm
            actionType="unsuspend"
            targetId={id}
          />
        </div>
      </div>
    </div>
  );
}

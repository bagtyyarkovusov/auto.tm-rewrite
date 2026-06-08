"use client";

import { Button } from "@auto-tm/ui/components";

import { logout } from "../../actions";

export default function ReportsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Очередь жалоб</h1>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Выйти
          </Button>
        </form>
      </div>
      <p className="mt-4 text-neutral-600">
        Здесь будет список жалоб (реализуется в рамках задачи #184).
      </p>
    </div>
  );
}

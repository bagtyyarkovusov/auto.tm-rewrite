"use client";

export default function ErrorPage({ reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="p-8" role="alert">
      <h1>Временно недоступно. Попробуйте ещё раз.</h1>
      <button type="button" onClick={reset}>Попробовать ещё раз</button>
    </main>
  );
}

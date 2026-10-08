"use client";

export default function ErrorPage({ unstable_retry }: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry: () => void;
}) {
  return (
    <main className="p-8" role="alert">
      <h1>Временно недоступно. Попробуйте ещё раз.</h1>
      <button type="button" onClick={unstable_retry}>Попробовать ещё раз</button>
    </main>
  );
}

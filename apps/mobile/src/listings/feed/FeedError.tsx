import { ErrorState } from "@/components/ErrorState";

interface FeedErrorProps {
  error: unknown;
  onRetry: () => void;
}

export function FeedError({ error, onRetry }: FeedErrorProps) {
  return <ErrorState error={error} onRetry={onRetry} />;
}

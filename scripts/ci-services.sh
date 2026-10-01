#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="$repo_root/infra/compose/docker-compose.ci.yml"
project="auto_tm_ci_${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}_${GITHUB_RUN_ATTEMPT:?GITHUB_RUN_ATTEMPT is required}"

# Optional extra Compose file, relative to the repo root. Unset on the
# self-hosted runner; the hosted-runner trial uses it to swap the MinIO image.
compose_files=(--file "$compose_file")
if [[ -n "${CI_COMPOSE_OVERRIDE:-}" ]]; then
  compose_files+=(--file "$repo_root/$CI_COMPOSE_OVERRIDE")
fi

compose() {
  docker compose "${compose_files[@]}" --project-name "$project" "$@"
}

published_port() {
  local binding
  binding="$(compose port "$1" "$2")"
  if [[ ! "$binding" =~ ^127\.0\.0\.1:([0-9]+)$ ]]; then
    echo "Expected a loopback port for $1, got: $binding" >&2
    exit 1
  fi
  printf '%s' "${BASH_REMATCH[1]}"
}

case "${1:-}" in
  up)
    : "${GITHUB_ENV:?GITHUB_ENV is required}"
    compose up --detach --wait --wait-timeout 120
    postgres_port="$(published_port postgres 5432)"
    redis_port="$(published_port redis 6379)"
    minio_port="$(published_port minio 9000)"

    # The workflow owns every test value; none comes from the runner's .env.
    {
      printf 'DATABASE_URL=postgresql://auto_tm_ci:auto_tm_ci_pass@127.0.0.1:%s/auto_tm_ci\n' "$postgres_port"
      printf 'REDIS_URL=redis://127.0.0.1:%s\n' "$redis_port"
      printf 'MINIO_ENDPOINT=http://127.0.0.1:%s\n' "$minio_port"
      printf 'MINIO_PUBLIC_URL=http://127.0.0.1:%s\n' "$minio_port"
      printf '%s\n' \
        'MINIO_ACCESS_KEY=minioadmin' \
        'MINIO_SECRET_KEY=minioadmin' \
        'MINIO_REGION=us-east-1' \
        'JWT_ACCESS_SECRET=ci_only_access_secret_0123456789abcdef' \
        'JWT_REFRESH_SECRET=ci_only_refresh_secret_0123456789abcdef' \
        'TOTP_SECRET_ENCRYPTION_KEY=MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=' \
        'REPORT_ENTRY_ENABLED=true' \
        'ADMIN_MODERATION_ACTIONS_ENABLED=true'
    } >> "$GITHUB_ENV"
    ;;
  logs)
    compose logs --no-color --tail=100
    ;;
  down)
    compose down --volumes --remove-orphans
    ;;
  *)
    echo "Usage: $0 {up|logs|down}" >&2
    exit 2
    ;;
esac

/**
 * Deploy evidence metadata baked into /healthz and /readyz responses.
 *
 * The commit SHA must survive a Railway rebuild of the same revision, so the
 * image build bakes `AUTOTM_COMMIT_SHA` from the `RAILWAY_GIT_COMMIT_SHA`
 * Docker build arg (infra/docker/*.Dockerfile). The runtime Railway-injected
 * variables are fallbacks for non-image execution (local dev, bare node).
 * Neither value is secret.
 */
export interface DeployMetadata {
  commitSha: string;
  environment: string;
}

export function getDeployMetadata(env: {
  AUTOTM_COMMIT_SHA?: string | undefined;
  RAILWAY_GIT_COMMIT_SHA?: string | undefined;
  APP_ENV?: string | undefined;
  RAILWAY_ENVIRONMENT_NAME?: string | undefined;
}): DeployMetadata {
  return {
    commitSha:
      env.AUTOTM_COMMIT_SHA ?? env.RAILWAY_GIT_COMMIT_SHA ?? "unknown",
    environment:
      env.RAILWAY_ENVIRONMENT_NAME ?? env.APP_ENV ?? "development",
  };
}

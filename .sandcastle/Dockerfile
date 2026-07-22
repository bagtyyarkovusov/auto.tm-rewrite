# Sandcastle sandbox image for auto.tm-rewrite.
#
# Dual agent providers on the Kimi Code API:
#   - Claude Code CLI (`claude`) — primary, pointed at Kimi's Anthropic-compatible
#     endpoint at runtime via ANTHROPIC_* env (main.mts)
#   - Kimi Code CLI (`kimi`) — native fallback provider, configured at runtime
#     via the KIMI_MODEL_* env channel (main.mts)
#
# Also ships: GitHub CLI (`gh`), pnpm, Context7 MCP, Railway CLI + Claude Code skill.
#
# Build with:
#   pnpm exec sandcastle docker build-image --dockerfile .sandcastle/Dockerfile
# The --dockerfile flag sets the build context to the repo root so the warm-store
# COPY below can read pnpm-lock.yaml (.sandcastle/Dockerfile.dockerignore keeps the
# context tiny). build-image auto-detects your host UID/GID (id -u / id -g) and
# passes them as build
# args so files created inside the container (worktrees, commits) are owned by
# you — cleanup and git work without sudo.
#
# This is a HOST-SIDE dev image (it runs on the developer Mac). It is never
# shipped to the air-gapped runtime. It bakes a warm pnpm store so per-worktree
# installs run offline + fast (see .sandcastle/main.mts install hook).
#
# Secrets (KIMI_API_KEY, GH_TOKEN, CONTEXT7_API_KEY, RAILWAY_TOKEN) are injected
# at runtime from .sandcastle/.env; they are never baked into this image.

FROM node:22.19-bookworm

# 1. System deps. (No Playwright/browser libs — the in-sandbox gate is
#    typecheck + lint + Docker-free unit tests only; e2e runs on CI. See ADR-0028.)
RUN for attempt in 1 2 3 4 5; do \
      apt-get update && break; \
      if [ "$attempt" = "5" ]; then exit 1; fi; \
      sleep 5; \
    done && \
    apt-get install -y \
      git \
      curl \
      jq \
    && rm -rf /var/lib/apt/lists/*

# 2. GitHub CLI (the agents shell out to `gh` for issue read/close).
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# 3. UID/GID alignment. `sandcastle docker build-image` auto-detects these from
#    the host (id -u / id -g). Defaults (1000:1000) are fallbacks for manual builds.
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# Resolve the macOS GID-20 conflict: on macOS the host GID is 20 (staff), which
# in Debian bookworm already exists as `dialout`. Force-delete the conflicting
# group first so groupmod can reassign the GID to `node`, then rename the user
# to `agent`. (Proven block from the sandcastle-test baseline.)
RUN if getent group $AGENT_GID >/dev/null; then \
      CONFLICT_GROUP=$(getent group $AGENT_GID | cut -d: -f1); \
      if [ "$CONFLICT_GROUP" != "node" ]; then \
        groupdel -f "$CONFLICT_GROUP" 2>/dev/null || true; \
      fi; \
    fi && \
    groupmod -g $AGENT_GID node && \
    usermod -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node

# 4. Enable corepack as root (writes pnpm/yarn shims into the root-owned node bin).
RUN corepack enable

USER ${AGENT_UID}:${AGENT_GID}

# 5. Pin pnpm 10 for Sandcastle only. The repo itself remains pinned to pnpm 9
#    until Expo/Metro are validated under pnpm 10 globally; this image opts into
#    pnpm 10's global virtual store only inside the sandbox install hook.
RUN corepack prepare pnpm@10.33.2 --activate

# Use a dedicated store dir so the warm-store layer (below) and the per-worktree
# `pnpm install --offline` at run time agree on a single content-addressable store.
RUN pnpm config set store-dir /home/agent/.pnpm-store --global

# 6. Kimi Code CLI. Official npm package install, not the curl installer.
#    The API key is injected at run time through KIMI_MODEL_* env vars in
#    .sandcastle/main.mts, so config.toml never bakes secrets into the image.
RUN mkdir -p /home/agent/.local && \
    NPM_CONFIG_PREFIX=/home/agent/.local npm install -g @moonshot-ai/kimi-code

# Keep Kimi's runtime data under ~/.kimi so the vendored sandcastle kimiCode
# provider's session capture path and the CLI's KIMI_CODE_HOME agree.
ENV KIMI_CODE_HOME="/home/agent/.kimi"

RUN mkdir -p /home/agent/.kimi && \
    printf 'default_model = "k3"\ndefault_permission_mode = "auto"\ndefault_plan_mode = false\ntelemetry = false\n\n[thinking]\nenabled = true\neffort = "high"\nkeep = "all"\n\n[loop_control]\nreserved_context_size = 50000\n\n[background]\nkeep_alive_on_exit = true\nprint_wait_ceiling_s = 3600\n' > /home/agent/.kimi/config.toml && \
    printf '{"mcpServers":{"context7":{"command":"npx","args":["-y","@upstash/context7-mcp"]}}}\n' > /home/agent/.kimi/mcp.json

ENV PATH="/home/agent/.local/bin:${PATH}"

# 7. Claude Code CLI — primary Sandcastle provider. The Kimi endpoint, API key,
#    model (k3 / k3[1m] / kimi-for-coding), window and effort all arrive at run
#    time via ANTHROPIC_* / CLAUDE_CODE_* env injected by main.mts.
RUN curl -fsSL https://claude.ai/install.sh | bash

# Pre-complete Claude Code onboarding so `claude --print` runs headless from a
# cold HOME (the CLI refuses print mode until these flags exist).
RUN printf '{"penguinModeOrgEnabled":true,"hasCompletedOnboarding":true}' \
      > /home/agent/.claude.json

# Trust only the repository's named Context7 project server in headless runs.
# User scope here avoids a first-run project-MCP approval prompt in sandboxes.
RUN mkdir -p /home/agent/.claude && \
    printf '{"enableAllProjectMcpServers":false,"enabledMcpjsonServers":["context7"]}' \
      > /home/agent/.claude/settings.json

# 8. Railway CLI. Direct binary download: the npm package's postinstall 404s
#    on linux/arm64 (no aarch64-unknown-linux-gnu release asset); the musl
#    build is statically linked and runs fine on bookworm. Auth via RAILWAY_TOKEN
#    injected at runtime. The orchestrator also pins RAILWAY_PROJECT_ID and
#    RAILWAY_ENVIRONMENT_ID so CLI commands deterministically target the right
#    project — `railway list` does NOT work with token auth (account-level
#    listing needs OAuth), so always operate against the pinned project.
ARG RAILWAY_CLI_VERSION=5.27.0
RUN set -e; \
    case "$(uname -m)" in \
      aarch64) TRIPLE="aarch64-unknown-linux-musl" ;; \
      x86_64)  TRIPLE="x86_64-unknown-linux-gnu" ;; \
      *) echo "unsupported arch: $(uname -m)" >&2; exit 1 ;; \
    esac; \
    curl -fsSL "https://github.com/railwayapp/cli/releases/download/v${RAILWAY_CLI_VERSION}/railway-v${RAILWAY_CLI_VERSION}-${TRIPLE}.tar.gz" \
      | tar -xz -C /home/agent/.local/bin railway && \
    /home/agent/.local/bin/railway skills install --agent claude-code && \
    test -f /home/agent/.claude/skills/use-railway/SKILL.md

# 9. Warm the pnpm store from the lockfile only (pnpm fetch needs just the
#    lockfile + workspace manifest — no per-package package.json copies). Use the
#    same global-virtual-store flag as the runtime hook so the shared link graph is
#    baked into the image too. Rebuild the image when pnpm-lock.yaml changes.
WORKDIR /home/agent/.warmup
COPY --chown=${AGENT_UID}:${AGENT_GID} pnpm-lock.yaml pnpm-workspace.yaml ./
# The lockfile references the vendored sandcastle tarball via `file:`, so it must
# be present for `pnpm fetch` to resolve it. (Sandcastle is a host-only devDep but
# lives in the single shared lockfile; warming it costs a few harmless MB.)
COPY --chown=${AGENT_UID}:${AGENT_GID} vendor ./vendor
# Resilient fetch for slow/intermittent links: keep retries and a generous
# per-request timeout, but do not lower pnpm's default network concurrency. The
# image build is the one place where we want to spend bandwidth so parallel
# sandbox installs can stay offline.
RUN pnpm config set fetch-retries 5 \
 && pnpm config set fetch-timeout 300000 \
 && pnpm fetch --config.enableGlobalVirtualStore=true

WORKDIR /home/agent

# 10. Sandcastle drives commands into the running container; keep it alive.
ENTRYPOINT ["sleep", "infinity"]

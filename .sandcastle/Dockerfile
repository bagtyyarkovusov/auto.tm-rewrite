# Sandcastle sandbox image for auto.tm-rewrite.
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

FROM node:22-bookworm

# 1. System deps. (No Playwright/browser libs — the in-sandbox gate is
#    typecheck + lint + Docker-free unit tests only; e2e runs on CI. See ADR-0028.)
RUN apt-get update && apt-get install -y \
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

# 6. Kimi Code CLI. The API key is injected at run time via the KIMI_API_KEY env
#    var (sandcastle forwards it from .sandcastle/.env), so api_key stays empty here.
RUN export PATH="/home/agent/.local/bin:$PATH" && curl -LsSf https://code.kimi.com/install.sh | bash

RUN mkdir -p /home/agent/.kimi && \
    printf 'default_model = "kimi-k2.6"\n\n[providers.kimi]\ntype = "kimi"\nbase_url = "https://api.kimi.com/coding/v1"\napi_key = ""\n\n[models."kimi-k2.6"]\nprovider = "kimi"\nmodel = "kimi-k2.6"\nmax_context_size = 262144\n' > /home/agent/.kimi/config.toml && \
    printf '{"mcpServers":{"context7":{"command":"npx","args":["-y","@upstash/context7-mcp"]}}}\n' > /home/agent/.kimi/mcp.json

ENV PATH="/home/agent/.local/bin:${PATH}"

# 7. Warm the pnpm store from the lockfile only (pnpm fetch needs just the
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

# 8. Claude Code CLI. The planner/implementer/reviewer/merger now run the `claude`
#    CLI against Kimi's Anthropic-compatible endpoint — ANTHROPIC_BASE_URL +
#    ANTHROPIC_API_KEY are forwarded from .sandcastle/.env at run time (EnvResolver).
#    The Kimi CLI above is kept so the kimiCode provider still works if we revert.
RUN mkdir -p /home/agent/.local && \
    NPM_CONFIG_PREFIX=/home/agent/.local npm install -g @anthropic-ai/claude-code

# Register Context7 MCP for Claude Code at user scope (ADR-0017), mirroring the kimi
# mcp.json above. CONTEXT7_API_KEY is forwarded from .env at run time.
RUN printf '{"mcpServers":{"context7":{"command":"npx","args":["-y","@upstash/context7-mcp"]}}}\n' > /home/agent/.claude.json

# sandcastle drives commands into the running container; keep it alive.
ENTRYPOINT ["sleep", "infinity"]

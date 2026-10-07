import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const help = `Compact GitHub operations (JSON output; writes require --apply):
  pnpm agent:github issue N | pr N | execution N
  pnpm agent:github queue [--limit 20]
  pnpm agent:github comments issue|pr N [--limit 3]
  pnpm agent:github create-issue --title TEXT --body-file FILE [--label NAME] [--apply]
  pnpm agent:github comment issue|pr N --body-file FILE [--apply]
Reads accept --max-chars 1800 and --full for complete bodies.
All commands accept --repo [HOST/]OWNER/REPO. Comments are issue comments,
not formal PR reviews. Queue output is a bounded snapshot, not a merge verdict.`;

function bounded(text = "", limit) {
  return { text: text.slice(0, limit), truncated: text.length > limit };
}

function sections(body = "", pattern) {
  const result = [];
  let current;
  let fence;
  for (const line of body.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
    } else if (marker) {
      fence = marker[1];
    } else {
      const heading = line.match(/^#{1,2}\s+(.+?)\s*#*$/);
      if (heading) {
        current = pattern.test(heading[1]) ? { heading: heading[1], lines: [] } : undefined;
        if (current) result.push(current);
        continue;
      }
    }
    if (current) current.lines.push(line);
  }
  return result.map(({ heading, lines }) => ({ heading, text: lines.join("\n").trim() }));
}

export function executionSections(body) {
  return sections(body, /^Execution state(?:\s|$)/i);
}

function integer(value, maximum, label) {
  if (!/^[1-9]\d*$/.test(value ?? "") || Number(value) > maximum) throw new Error(`Invalid ${label}`);
  return Number(value);
}

export function parseCommand(args) {
  const [command, ...rest] = args;
  if (!command || command === "--help" || command === "help") return { command: "help" };
  const config = { command, limit: command === "comments" ? 3 : 20, maxChars: 1800, labels: [], apply: false, full: false };
  const writes = ["create-issue", "comment"].includes(command);
  if (!["issue", "pr", "execution", "queue", "comments", "create-issue", "comment"].includes(command)) throw new Error("Unknown command; use --help");
  if (["comments", "comment"].includes(command)) {
    config.kind = rest.shift();
    if (!["issue", "pr"].includes(config.kind)) throw new Error("Choose issue or pr");
  }
  if (!["queue", "create-issue"].includes(command)) config.number = integer(rest.shift(), 2147483647, "issue/PR number");
  const allowed = new Set(["--repo"]);
  if (writes) { allowed.add("--body-file"); allowed.add("--apply"); }
  else { allowed.add("--max-chars"); allowed.add("--full"); }
  if (["queue", "comments"].includes(command)) allowed.add("--limit");
  if (command === "create-issue") { allowed.add("--title"); allowed.add("--label"); }
  while (rest.length) {
    const flag = rest.shift();
    if (!allowed.has(flag)) throw new Error(`Unsupported flag: ${flag}`);
    if (flag === "--apply") { config.apply = true; continue; }
    if (flag === "--full") { config.full = true; continue; }
    const value = rest.shift();
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    if (flag === "--limit") config.limit = integer(value, 100, "limit (1..100)");
    if (flag === "--max-chars") config.maxChars = integer(value, 20000, "character limit (1..20000)");
    if (flag === "--repo") config.repo = value;
    if (flag === "--title") config.title = value.trim();
    if (flag === "--label") config.labels.push(value);
    if (flag === "--body-file") config.bodyFile = resolve(value);
  }
  if (writes && !config.bodyFile) throw new Error("Writes require --body-file");
  if (command === "create-issue" && !config.title) throw new Error("Issue creation requires --title");
  return config;
}

export function compactItem(item, kind, maxChars = 1800) {
  const result = {
    number: item.number, title: item.title, state: item.state, url: item.url,
    labels: item.labels?.map((label) => label.name),
  };
  const compactSections = (values) => values.map(({ heading, text }) => ({ heading, ...bounded(text, maxChars) }));
  if (kind === "issue") {
    result.acceptance = compactSections(sections(item.body, /^Acceptance criteria\b/i));
    result.dependencies = compactSections(sections(item.body, /^Depends on\b/i));
  } else {
    Object.assign(result, {
      branch: item.headRefName, head: item.headRefOid, draft: item.isDraft,
      autoMerge: Boolean(item.autoMergeRequest), execution: compactSections(executionSections(item.body)),
      checks: (item.statusCheckRollup ?? []).map((check) => ({
        name: check.name ?? check.context,
        state: check.conclusion || check.status || check.state || "UNKNOWN",
      })),
    });
  }
  return result;
}

function execute(program, args) {
  const result = spawnSync(program, args, {
    encoding: "utf8", timeout: 60000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GH_PROMPT_DISABLED: "1", GH_NO_UPDATE_NOTIFIER: "1" },
  });
  if (result.error || result.status !== 0) throw new Error(`${program} failed: ${result.error?.message ?? result.stderr.trim().slice(0, 1200)}`);
  return result.stdout;
}

function repository(explicit) {
  const value = explicit ?? execute("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]).trim();
  const parts = value.split("/");
  if (![2, 3].includes(parts.length) || parts.some((part) => !/^[\w.-]+$/.test(part))) throw new Error("Invalid repository; use [HOST/]OWNER/REPO");
  return { name: value, host: parts.length === 3 ? parts[0] : "github.com", owner: parts.at(-2), repo: parts.at(-1) };
}

export function runCommand(config, dependencies = {}) {
  if (config.command === "help") return { help };
  const gh = dependencies.gh ?? ((args) => execute("gh", args));
  const repo = repository(config.repo ?? dependencies.repo);
  const limit = config.full ? Number.MAX_SAFE_INTEGER : config.maxChars;
  if (["comment", "create-issue"].includes(config.command)) {
    const body = readFileSync(config.bodyFile, "utf8");
    if (!body.trim()) throw new Error("Body file is empty");
    const args = config.command === "comment"
      ? [config.kind, "comment", String(config.number)]
      : ["issue", "create", "--title", config.title, ...config.labels.flatMap((label) => ["--label", label])];
    args.push("--repo", repo.name, "--body-file", config.bodyFile);
    if (!config.apply) return { dryRun: true, args, bodyCharacters: body.length };
    return { applied: true, url: gh(args).trim() };
  }
  if (config.command === "comments") {
    const field = config.kind === "pr" ? "pullRequest" : "issue";
    const query = `query($owner:String!,$repo:String!,$number:Int!,$limit:Int!) { repository(owner:$owner,name:$repo) { ${field}(number:$number) { comments(last: $limit) { totalCount pageInfo { hasPreviousPage } nodes { url createdAt author { login } body } } } } }`;
    const data = JSON.parse(gh(["api", "graphql", "--hostname", repo.host, "-f", `query=${query}`, "-f", `owner=${repo.owner}`, "-f", `repo=${repo.repo}`, "-F", `number=${config.number}`, "-F", `limit=${config.limit}`]));
    if (data.errors?.length) throw new Error("GitHub GraphQL returned errors");
    const comments = data.data?.repository?.[field]?.comments;
    if (!comments) throw new Error("GitHub returned no comment connection");
    return {
      number: config.number, totalComments: comments.totalCount,
      omittedComments: comments.totalCount - comments.nodes.length,
      comments: comments.nodes.map(({ body, ...comment }) => ({ ...comment, body: body.slice(0, limit), truncated: body.length > limit })),
    };
  }
  const issueFields = "number,title,state,url,labels,body";
  const prFields = "number,title,state,url,headRefName,headRefOid,isDraft,autoMergeRequest,statusCheckRollup,body";
  if (config.command === "queue") {
    const items = JSON.parse(gh(["pr", "list", "--repo", repo.name, "--state", "open", "--limit", String(config.limit), "--json", prFields]));
    return { snapshot: true, limit: config.limit, possiblyMore: items.length === config.limit, prs: items.map((item) => compactItem(item, "pr", limit)) };
  }
  const kind = config.command === "issue" ? "issue" : "pr";
  const item = JSON.parse(gh([kind, "view", String(config.number), "--repo", repo.name, "--json", kind === "issue" ? issueFields : prFields]));
  if (config.command === "execution") return { number: item.number, head: item.headRefOid, execution: compactItem(item, "pr", limit).execution };
  return { ...compactItem(item, kind, limit), ...(config.full ? { body: item.body } : {}), omitted: config.full ? [] : ["full body", "comments", "formal reviews"] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(runCommand(parseCommand(process.argv.slice(2))))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

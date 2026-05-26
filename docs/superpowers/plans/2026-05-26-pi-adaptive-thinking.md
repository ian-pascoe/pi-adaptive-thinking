# Pi Adaptive Thinking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `pi-adaptive-thinking`, a Pi-native extension/package that lets Pi agents adjust thinking level through an OpenCode-compatible `set_reasoning_effort` tool with temporary and persistent modes.

**Architecture:** Copy the proven package/tooling shape from `pi-byterover`, then implement a small runtime split into config loading, level helpers, and the extension entrypoint. The runtime uses `pi.getThinkingLevel()`, `pi.setThinkingLevel()`, `thinking_level_select`, and `@earendil-works/pi-ai/getSupportedThinkingLevels()` rather than OpenCode model variants.

**Tech Stack:** TypeScript ESM, Pi extension API (`@earendil-works/pi-coding-agent`), TypeBox tool schemas, Zod config validation, Vitest, Rolldown, pnpm.

---

## File Structure

Create/modify these files:

- Create `AGENTS.md`: repo-specific development instructions.
- Create `package.json`: npm/pi package metadata, scripts, dependencies, peer dependencies, `pi.extensions`.
- Create `pnpm-workspace.yaml`: single-package workspace declaration.
- Create `tsconfig.json`: strict TypeScript project config.
- Create `tsconfig.build.json`: declaration-only build target excluding tests.
- Create `rolldown.config.ts`: bundle `src/index.ts` to `dist/`.
- Create `.gitignore`: ignore dependencies, output, local state.
- Create `.oxlintrc.json` and `.oxfmtrc.json`: match existing repo tooling conventions.
- Create `src/config.ts`: defaults and Zod schema.
- Create `src/config-loader.ts`: project/global config loading.
- Create `src/thinking-levels.ts`: Pi thinking-level constants and supported-level resolver.
- Create `src/index.ts`: extension runtime, tool registration, system prompt injection, reset handling.
- Create tests:
  - `src/config.test.ts`
  - `src/config-loader.test.ts`
  - `src/thinking-levels.test.ts`
  - `src/index.test.ts`
- Create `README.md`: installation, configuration, behavior, development commands.

---

### Task 1: Bootstrap Package Tooling

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `tsconfig.build.json`
- Create: `rolldown.config.ts`
- Create: `.gitignore`
- Create: `.oxlintrc.json`
- Create: `.oxfmtrc.json`
- Create: `AGENTS.md`

- [ ] **Step 1: Create package metadata**

Write `package.json`:

```json
{
  "name": "pi-adaptive-thinking",
  "version": "0.1.0",
  "description": "Pi Adaptive Thinking extension",
  "keywords": ["pi", "pi-package", "thinking", "reasoning", "adaptive-thinking"],
  "homepage": "https://github.com/ian-pascoe/pi-adaptive-thinking#readme",
  "bugs": { "url": "https://github.com/ian-pascoe/pi-adaptive-thinking/issues" },
  "license": "MIT",
  "author": "Ian Pascoe",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ian-pascoe/pi-adaptive-thinking.git"
  },
  "files": ["dist", "README.md"],
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "scripts": {
    "build": "pnpm run clean && pnpm run build:js && pnpm run build:types",
    "build:js": "rolldown -c",
    "build:types": "tsgo --project tsconfig.build.json --emitDeclarationOnly",
    "build:watch": "rolldown -c -w",
    "clean": "rm -rf dist",
    "format": "oxfmt",
    "format:check": "oxfmt --check",
    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "test": "vitest run",
    "typecheck": "tsgo --noEmit",
    "verify": "pnpm run format:check && pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build",
    "prepare": "husky"
  },
  "dependencies": {
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@changesets/changelog-github": "^0.7.0",
    "@changesets/cli": "^2.31.0",
    "@types/node": "^25.9.1",
    "@typescript/native-preview": "7.0.0-dev.20260526.1",
    "husky": "^9.1.7",
    "oxfmt": "^0.52.0",
    "oxlint": "^1.67.0",
    "rolldown": "1.0.2",
    "typescript": "^6.0.3",
    "vitest": "^4.1.7"
  },
  "peerDependencies": {
    "@earendil-works/pi-ai": "*",
    "@earendil-works/pi-coding-agent": "*",
    "typebox": "*"
  },
  "packageManager": "pnpm@10.33.2",
  "pi": {
    "extensions": ["./dist/index.js"]
  }
}
```

- [ ] **Step 2: Create workspace and build configs**

Write `pnpm-workspace.yaml`:

```yaml
packages:
  - .
```

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "esnext",
    "target": "esnext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "lib": ["esnext"],
    "types": ["@types/node"],
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "strict": true,
    "jsx": "preserve",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Write `tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declarationMap": false
  },
  "include": ["src/index.ts"],
  "exclude": ["node_modules", "dist", "src/**/*.test.ts"]
}
```

Write `rolldown.config.ts`:

```ts
import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "esm",
  },
  platform: "node",
});
```

- [ ] **Step 3: Create repo hygiene files**

Write `.gitignore`:

```gitignore
node_modules/
dist/
.brv/
.DS_Store
*.log
```

Write `.oxlintrc.json`:

```json
{
  "ignorePatterns": ["dist/**", ".brv/**"]
}
```

Write `.oxfmtrc.json`:

```json
{
  "ignorePatterns": ["dist/**", ".brv/**"]
}
```

Write `AGENTS.md`:

```md
# AGENTS.md - pi-adaptive-thinking

## Project Shape

- This is a single-package ESM TypeScript Pi extension/package.
- Runtime entrypoint: `src/index.ts`.
- Build output: `dist/`, generated by Rolldown; do not edit by hand.
- The extension registers a `set_reasoning_effort` tool and uses Pi thinking-level APIs.

## Commands

- Use `pnpm` only.
- Install with `pnpm install`.
- Checks: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Full verification: `pnpm verify`.

## Local State

- `.brv/` is ByteRover local state and must not be committed.
- `dist/` is generated output and must not be edited directly.
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
pnpm install
```

Expected: creates `pnpm-lock.yaml` and installs dependencies without errors.

- [ ] **Step 5: Commit tooling bootstrap**

Run:

```bash
git add package.json pnpm-workspace.yaml tsconfig.json tsconfig.build.json rolldown.config.ts .gitignore .oxlintrc.json .oxfmtrc.json AGENTS.md pnpm-lock.yaml
git commit -m "chore: bootstrap pi adaptive thinking package"
```

Expected: commit succeeds.

---

### Task 2: Implement Config Defaults and Loader

**Files:**

- Create: `src/config.ts`
- Create: `src/config-loader.ts`
- Create: `src/config.test.ts`
- Create: `src/config-loader.test.ts`

- [ ] **Step 1: Write config tests**

Write `src/config.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { ConfigSchema, configDefaults, defaultSystemPrompt } from "./config.js";

describe("ConfigSchema", () => {
  test("uses defaults when input is undefined", () => {
    expect(ConfigSchema.parse(undefined)).toEqual(configDefaults);
  });

  test("merges partial config with defaults", () => {
    expect(ConfigSchema.parse({ toolName: "think_harder" })).toEqual({
      ...configDefaults,
      toolName: "think_harder",
    });
  });

  test("rejects invalid config types", () => {
    expect(() => ConfigSchema.parse({ enabled: "yes" })).toThrow();
  });

  test("default prompt requires active reasoning management", () => {
    expect(defaultSystemPrompt).toContain("manage reasoning effort actively");
    expect(defaultSystemPrompt).toContain("NEVER leave the current level unchanged by inertia");
  });
});
```

- [ ] **Step 2: Run config tests and verify failure**

Run:

```bash
pnpm test src/config.test.ts
```

Expected: FAIL because `src/config.ts` does not exist.

- [ ] **Step 3: Implement config schema**

Write `src/config.ts`:

```ts
import * as z from "zod/v4";

export const defaultSystemPrompt =
  "You MUST manage reasoning effort actively. " +
  "Lower it before trivial or routine turns; raise it for ambiguity, debugging, risky changes, or multi-step synthesis. " +
  "Reassess at turn start, after meaningful new evidence, and when the task shifts. " +
  "NEVER leave the current level unchanged by inertia, and NEVER reply to a trivial turn before considering a downshift.";

export const configDefaults = {
  enabled: true,
  quiet: false,
  toolName: "set_reasoning_effort",
  toolDescription: "Set your reasoning effort",
  systemPrompt: defaultSystemPrompt,
};

export const ConfigSchema = z
  .object({
    enabled: z.boolean().default(configDefaults.enabled),
    quiet: z.boolean().default(configDefaults.quiet),
    toolName: z.string().min(1).default(configDefaults.toolName),
    toolDescription: z.string().min(1).default(configDefaults.toolDescription),
    systemPrompt: z.string().min(1).default(configDefaults.systemPrompt),
  })
  .optional()
  .default(configDefaults);
```

- [ ] **Step 4: Verify config tests pass**

Run:

```bash
pnpm test src/config.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write config-loader tests**

Write `src/config-loader.test.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { configDefaults } from "./config.js";
import { loadConfig } from "./config-loader.js";

const makeDirs = async (root: string) => {
  const cwd = join(root, "project");
  const homeDir = join(root, "home");
  await mkdir(join(cwd, ".pi"), { recursive: true });
  await mkdir(join(homeDir, ".pi", "agent"), { recursive: true });
  return { cwd, homeDir };
};

describe("loadConfig", () => {
  test("returns defaults when no config files exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-adaptive-thinking-"));
    const { cwd, homeDir } = await makeDirs(root);

    await expect(loadConfig({ cwd, homeDir })).resolves.toEqual({
      success: true,
      config: configDefaults,
    });
  });

  test("loads global config", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-adaptive-thinking-"));
    const { cwd, homeDir } = await makeDirs(root);
    const globalPath = join(homeDir, ".pi", "agent", "adaptive-thinking.json");
    await writeFile(globalPath, JSON.stringify({ toolName: "global_tool" }));

    await expect(loadConfig({ cwd, homeDir })).resolves.toEqual({
      success: true,
      source: globalPath,
      config: { ...configDefaults, toolName: "global_tool" },
    });
  });

  test("project config takes precedence over global config", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-adaptive-thinking-"));
    const { cwd, homeDir } = await makeDirs(root);
    await writeFile(
      join(homeDir, ".pi", "agent", "adaptive-thinking.json"),
      JSON.stringify({ toolName: "global_tool" }),
    );
    const projectPath = join(cwd, ".pi", "adaptive-thinking.json");
    await writeFile(projectPath, JSON.stringify({ toolName: "project_tool" }));

    await expect(loadConfig({ cwd, homeDir })).resolves.toEqual({
      success: true,
      source: projectPath,
      config: { ...configDefaults, toolName: "project_tool" },
    });
  });

  test("returns structured error for invalid config", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-adaptive-thinking-"));
    const { cwd, homeDir } = await makeDirs(root);
    const projectPath = join(cwd, ".pi", "adaptive-thinking.json");
    await writeFile(projectPath, JSON.stringify({ enabled: "yes" }));

    const result = await loadConfig({ cwd, homeDir });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.source).toBe(projectPath);
      expect(result.error.message).toContain("Invalid Adaptive Thinking configuration");
    }
  });
});
```

- [ ] **Step 6: Run loader tests and verify failure**

Run:

```bash
pnpm test src/config-loader.test.ts
```

Expected: FAIL because `src/config-loader.ts` does not exist.

- [ ] **Step 7: Implement config loader**

Write `src/config-loader.ts`:

```ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type * as z from "zod/v4";
import { ConfigSchema } from "./config.js";

export type AdaptiveThinkingConfig = z.infer<typeof ConfigSchema>;

export type LoadConfigOptions = {
  cwd: string;
  homeDir?: string;
};

export type LoadConfigResult =
  | { success: true; config: AdaptiveThinkingConfig; source?: string }
  | { success: false; source: string; error: Error };

const hasCode = (error: unknown, code: string) => {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const invalidConfig = (source: string, error: unknown): LoadConfigResult => ({
  success: false,
  source,
  error: new Error(`Invalid Adaptive Thinking configuration in ${source}: ${errorMessage(error)}`),
});

export const loadConfig = async ({
  cwd,
  homeDir = homedir(),
}: LoadConfigOptions): Promise<LoadConfigResult> => {
  const candidates = [
    join(cwd, ".pi", "adaptive-thinking.json"),
    join(homeDir, ".pi", "agent", "adaptive-thinking.json"),
  ];

  for (const source of candidates) {
    let raw: string;
    try {
      raw = await readFile(source, "utf8");
    } catch (error) {
      if (hasCode(error, "ENOENT")) continue;
      return invalidConfig(source, error);
    }

    try {
      return { success: true, source, config: ConfigSchema.parse(JSON.parse(raw)) };
    } catch (error) {
      return invalidConfig(source, error);
    }
  }

  return { success: true, config: ConfigSchema.parse(undefined) };
};
```

- [ ] **Step 8: Verify config task passes and commit**

Run:

```bash
pnpm test src/config.test.ts src/config-loader.test.ts
pnpm typecheck
```

Expected: tests and typecheck pass.

Commit:

```bash
git add src/config.ts src/config-loader.ts src/config.test.ts src/config-loader.test.ts
git commit -m "feat: add adaptive thinking configuration"
```

---

### Task 3: Implement Thinking Level Helpers

**Files:**

- Create: `src/thinking-levels.ts`
- Create: `src/thinking-levels.test.ts`

- [ ] **Step 1: Write helper tests**

Write `src/thinking-levels.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  fallbackThinkingLevels,
  isThinkingLevel,
  resolveSupportedThinkingLevels,
} from "./thinking-levels.js";

describe("thinking level helpers", () => {
  test("recognizes valid Pi thinking levels", () => {
    expect(isThinkingLevel("off")).toBe(true);
    expect(isThinkingLevel("minimal")).toBe(true);
    expect(isThinkingLevel("low")).toBe(true);
    expect(isThinkingLevel("medium")).toBe(true);
    expect(isThinkingLevel("high")).toBe(true);
    expect(isThinkingLevel("xhigh")).toBe(true);
    expect(isThinkingLevel("turbo")).toBe(false);
  });

  test("uses fallback levels when model is undefined", () => {
    expect(resolveSupportedThinkingLevels(undefined)).toEqual(fallbackThinkingLevels);
  });

  test("uses model thinkingLevelMap null entries to remove unsupported levels", () => {
    expect(
      resolveSupportedThinkingLevels({
        id: "model",
        name: "Model",
        api: "openai-completions",
        provider: "provider",
        baseUrl: "https://example.com",
        reasoning: true,
        thinkingLevelMap: {
          off: null,
          minimal: null,
          high: "high",
          xhigh: "max",
        },
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1000,
        maxTokens: 1000,
      }),
    ).toEqual(["low", "medium", "high", "xhigh"]);
  });
});
```

- [ ] **Step 2: Run helper tests and verify failure**

Run:

```bash
pnpm test src/thinking-levels.test.ts
```

Expected: FAIL because `src/thinking-levels.ts` does not exist.

- [ ] **Step 3: Implement helper module**

Write `src/thinking-levels.ts`:

```ts
import { getSupportedThinkingLevels } from "@earendil-works/pi-ai";
import type { Api, Model, ModelThinkingLevel } from "@earendil-works/pi-ai";

export const fallbackThinkingLevels = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;

export type PiThinkingLevel = (typeof fallbackThinkingLevels)[number];

const levelSet = new Set<string>(fallbackThinkingLevels);

export const isThinkingLevel = (level: string): level is PiThinkingLevel => levelSet.has(level);

export const resolveSupportedThinkingLevels = (
  model: Model<Api> | undefined,
): PiThinkingLevel[] => {
  if (!model) return [...fallbackThinkingLevels];

  return getSupportedThinkingLevels(model).filter(
    (level: ModelThinkingLevel): level is PiThinkingLevel => isThinkingLevel(level),
  );
};
```

- [ ] **Step 4: Verify helper tests and commit**

Run:

```bash
pnpm test src/thinking-levels.test.ts
pnpm typecheck
```

Expected: tests and typecheck pass.

Commit:

```bash
git add src/thinking-levels.ts src/thinking-levels.test.ts
git commit -m "feat: add thinking level helpers"
```

---

### Task 4: Implement Extension Runtime and Tool

**Files:**

- Create: `src/index.ts`
- Create: `src/index.test.ts`

- [ ] **Step 1: Write runtime tests**

Write `src/index.test.ts` with a lightweight mocked Pi API:

```ts
import { describe, expect, test, vi } from "vitest";
import adaptiveThinking from "./index.js";

type Handler = (event: any, ctx: any) => any;

const createPi = () => {
  const handlers = new Map<string, Handler[]>();
  const tools: any[] = [];
  const pi = {
    on: vi.fn((event: string, handler: Handler) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    }),
    registerTool: vi.fn((tool: any) => {
      tools.push(tool);
    }),
    getThinkingLevel: vi.fn(() => "medium"),
    setThinkingLevel: vi.fn(),
  };

  const emit = async (event: string, payload: any, ctx: any) => {
    let result: any;
    for (const handler of handlers.get(event) ?? []) {
      result = await handler(payload, ctx);
    }
    return result;
  };

  return { pi, tools, emit };
};

const createCtx = (overrides: Partial<any> = {}) => ({
  cwd: "/tmp/project",
  hasUI: true,
  ui: { notify: vi.fn() },
  model: undefined,
  ...overrides,
});

describe("adaptiveThinking extension", () => {
  test("registers the default tool and injects prompt guidance", async () => {
    const { pi, tools, emit } = createPi();
    adaptiveThinking(pi as never);

    await emit("session_start", { reason: "startup" }, createCtx());

    expect(tools[0].name).toBe("set_reasoning_effort");

    const result = await emit(
      "before_agent_start",
      { prompt: "hello", systemPrompt: "Base prompt" },
      createCtx(),
    );

    expect(result.systemPrompt).toContain("Base prompt");
    expect(result.systemPrompt).toContain("manage reasoning effort actively");
    expect(result.systemPrompt).toContain("Current reasoning effort level: medium");
    expect(result.systemPrompt).toContain(
      "Valid reasoning effort levels for this session: off, minimal, low, medium, high, xhigh",
    );
    expect(result.systemPrompt).toContain("set_reasoning_effort");
  });

  test("persistent tool call sets baseline and does not reset on agent_end", async () => {
    const { pi, tools, emit } = createPi();
    adaptiveThinking(pi as never);
    await emit("session_start", { reason: "startup" }, createCtx());

    const result = await tools[0].execute(
      "tool-call",
      { level: "high", persist: true },
      undefined,
      undefined,
      createCtx(),
    );

    expect(result.content[0].text).toBe("Reasoning effort set to high");
    expect(pi.setThinkingLevel).toHaveBeenCalledWith("high");

    vi.mocked(pi.setThinkingLevel).mockClear();
    await emit("agent_end", {}, createCtx());
    expect(pi.setThinkingLevel).not.toHaveBeenCalled();
  });

  test("temporary tool call restores previous level on agent_end", async () => {
    const { pi, tools, emit } = createPi();
    adaptiveThinking(pi as never);
    await emit("session_start", { reason: "startup" }, createCtx());

    const result = await tools[0].execute(
      "tool-call",
      { level: "high", persist: false },
      undefined,
      undefined,
      createCtx(),
    );

    expect(result.content[0].text).toBe("Reasoning effort set to high");
    expect(pi.setThinkingLevel).toHaveBeenCalledWith("high");

    await emit("agent_end", {}, createCtx());
    expect(pi.setThinkingLevel).toHaveBeenLastCalledWith("medium");
  });

  test("thinking_level_select updates cached current level", async () => {
    const { pi, tools, emit } = createPi();
    adaptiveThinking(pi as never);
    await emit("session_start", { reason: "startup" }, createCtx());
    await emit("thinking_level_select", { level: "low", previousLevel: "medium" }, createCtx());

    await tools[0].execute(
      "tool-call",
      { level: "high", persist: false },
      undefined,
      undefined,
      createCtx(),
    );
    await emit("agent_end", {}, createCtx());

    expect(pi.setThinkingLevel).toHaveBeenLastCalledWith("low");
  });

  test("invalid level returns error and does not call setter", async () => {
    const { pi, tools, emit } = createPi();
    adaptiveThinking(pi as never);
    await emit("session_start", { reason: "startup" }, createCtx());

    const result = await tools[0].execute(
      "tool-call",
      { level: "turbo", persist: false },
      undefined,
      undefined,
      createCtx(),
    );

    expect(result.content[0].text).toContain("Invalid reasoning effort level: turbo");
    expect(pi.setThinkingLevel).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run runtime tests and verify failure**

Run:

```bash
pnpm test src/index.test.ts
```

Expected: FAIL because `src/index.ts` does not exist.

- [ ] **Step 3: Implement extension runtime**

Write `src/index.ts`:

```ts
import type {
  AgentToolResult,
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";
import { loadConfig, type AdaptiveThinkingConfig } from "./config-loader.js";
import {
  isThinkingLevel,
  resolveSupportedThinkingLevels,
  type PiThinkingLevel,
} from "./thinking-levels.js";

type NotifyType = "info" | "warning" | "error";

type RuntimeState = {
  config: AdaptiveThinkingConfig;
  currentLevel?: PiThinkingLevel;
  persistedLevel?: PiThinkingLevel;
  temporaryResetLevel?: PiThinkingLevel;
};

const ToolParameters = Type.Object(
  {
    level: Type.String({
      minLength: 1,
      description:
        "The level of reasoning effort to apply. Higher levels may improve hard-task quality but may take more time and resources.",
    }),
    persist: Type.Optional(
      Type.Boolean({
        default: false,
        description:
          "Whether to persist the setting for this session; otherwise it applies only for the current turn.",
      }),
    ),
  },
  { additionalProperties: false },
);

type ToolParameters = Static<typeof ToolParameters>;

const textResult = (text: string): AgentToolResult<undefined> => ({
  content: [{ type: "text", text }],
  details: undefined,
});

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const notify = (
  ctx: ExtensionContext,
  type: NotifyType,
  message: string,
  config?: Pick<AdaptiveThinkingConfig, "quiet">,
) => {
  if (config?.quiet) return;
  if (!ctx.hasUI) return;
  ctx.ui.notify(message, type);
};

const appendSystemPromptBlock = (systemPrompt: string, block: string) => {
  const trimmedBlock = block.trim();
  if (!trimmedBlock) return systemPrompt;
  if (!systemPrompt.trim()) return trimmedBlock;
  return `${systemPrompt.trimEnd()}\n\n${trimmedBlock}`;
};

const formatGuidance = (
  config: AdaptiveThinkingConfig,
  currentLevel: string | undefined,
  validLevels: string[],
) => {
  return (
    config.systemPrompt.trim() +
    " " +
    (currentLevel ? `Current reasoning effort level: ${currentLevel}. ` : "") +
    `Valid reasoning effort levels for this session: ${validLevels.join(", ")}. ` +
    `To change your reasoning effort, use the \`${config.toolName}\` tool with one of the valid levels. ` +
    "Only call it when the task complexity justifies changing levels."
  );
};

export default function adaptiveThinking(pi: ExtensionAPI) {
  let runtime: RuntimeState | undefined;
  let runtimeHandlersRegistered = false;

  const registerRuntimeHandlers = () => {
    if (runtimeHandlersRegistered) return;
    runtimeHandlersRegistered = true;

    pi.on("thinking_level_select", async (event) => {
      if (!runtime) return;
      runtime.currentLevel = event.level;
    });

    pi.on("before_agent_start", async (event, ctx) => beforeAgentStart(event, ctx));

    pi.on("agent_end", async (_event, ctx) => {
      await resetTemporaryLevel(ctx);
    });
  };

  const beforeAgentStart = async (
    event: BeforeAgentStartEvent,
    ctx: ExtensionContext,
  ): Promise<BeforeAgentStartEventResult> => {
    const state = runtime;
    if (!state) return { systemPrompt: event.systemPrompt };

    const currentLevel = state.currentLevel ?? pi.getThinkingLevel();
    if (isThinkingLevel(currentLevel)) state.currentLevel = currentLevel;

    const validLevels = resolveSupportedThinkingLevels(ctx.model);
    return {
      systemPrompt: appendSystemPromptBlock(
        event.systemPrompt,
        formatGuidance(state.config, state.currentLevel, validLevels),
      ),
    };
  };

  const resetTemporaryLevel = async (ctx: ExtensionContext) => {
    const state = runtime;
    const resetLevel = state?.temporaryResetLevel;
    if (!state || !resetLevel) return;

    try {
      pi.setThinkingLevel(resetLevel);
      state.currentLevel = resetLevel;
      delete state.temporaryResetLevel;
    } catch (error) {
      notify(
        ctx,
        "error",
        `Failed to reset reasoning effort: ${errorMessage(error)}`,
        state.config,
      );
    }
  };

  pi.on("session_start", async (_event, ctx) => {
    const configResult = await loadConfig({ cwd: ctx.cwd });
    if (!configResult.success) {
      runtime = undefined;
      notify(ctx, "error", configResult.error.message);
      return;
    }

    const { config } = configResult;
    if (!config.enabled) {
      runtime = undefined;
      return;
    }

    const initialLevel = pi.getThinkingLevel();
    runtime = {
      config,
      currentLevel: isThinkingLevel(initialLevel) ? initialLevel : undefined,
    };

    pi.registerTool({
      name: config.toolName,
      label: "Set Reasoning Effort",
      description: config.toolDescription,
      promptSnippet: "Set the current reasoning effort / thinking level.",
      promptGuidelines: [
        `Use ${config.toolName} to change reasoning effort when task complexity justifies a different thinking level.`,
      ],
      parameters: ToolParameters,
      execute: async (_toolCallId, params: ToolParameters, _signal, _onUpdate, ctx) => {
        const state = runtime;
        if (!state) return textResult("Adaptive Thinking is not enabled for this session.");

        const level = params.level.trim();
        const validLevels = resolveSupportedThinkingLevels(ctx.model);
        if (!isThinkingLevel(level) || !validLevels.includes(level)) {
          return textResult(
            `Invalid reasoning effort level: ${level}. Valid levels: ${validLevels.join(", ")}.`,
          );
        }

        const persist = params.persist ?? false;
        const currentLevel = state.currentLevel ?? pi.getThinkingLevel();
        const resetLevel =
          state.persistedLevel ?? (isThinkingLevel(currentLevel) ? currentLevel : undefined);

        try {
          pi.setThinkingLevel(level);
        } catch (error) {
          return textResult(`Failed to set reasoning effort: ${errorMessage(error)}`);
        }

        state.currentLevel = level;
        if (persist) {
          state.persistedLevel = level;
          delete state.temporaryResetLevel;
        } else if (resetLevel && resetLevel !== level) {
          state.temporaryResetLevel = resetLevel;
        } else {
          delete state.temporaryResetLevel;
        }

        return textResult(`Reasoning effort set to ${level}`);
      },
    });

    registerRuntimeHandlers();
  });
}
```

- [ ] **Step 4: Verify runtime tests pass**

Run:

```bash
pnpm test src/index.test.ts
pnpm typecheck
```

Expected: tests and typecheck pass. If `AgentToolResult` import shape differs in the installed Pi typings, adjust only the import/type annotations while preserving runtime behavior.

- [ ] **Step 5: Commit runtime**

Run:

```bash
git add src/index.ts src/index.test.ts
git commit -m "feat: add adaptive thinking extension runtime"
```

---

### Task 5: Add README and Final Verification

**Files:**

- Create: `README.md`
- Modify if needed: source/tests after verification fixes

- [ ] **Step 1: Write README**

Write `README.md`:

````md
<div align="center">

# pi-adaptive-thinking

Bring adaptive reasoning-effort control to Pi agents.

</div>

`pi-adaptive-thinking` is a Pi extension that lets the agent change Pi's thinking level through a tool named `set_reasoning_effort`.

It mirrors the user-facing behavior of `opencode-adaptive-thinking` while using Pi-native APIs: `pi.getThinkingLevel()`, `pi.setThinkingLevel()`, and `thinking_level_select`.

## Installation

```bash
pi install npm:pi-adaptive-thinking
```
````

For local development:

```bash
pnpm install
pnpm build
pi -e ./dist/index.js
```

## Behavior

The extension registers a tool with these parameters:

- `level`: one of the valid Pi thinking levels for the current model.
- `persist`: optional boolean, default `false`.

Temporary changes:

```json
{ "level": "high", "persist": false }
```

This changes reasoning effort for the current agent turn and restores the prior/baseline level when the turn ends.

Persistent changes:

```json
{ "level": "low", "persist": true }
```

This changes the session baseline until another persistent change is made or the user changes thinking level manually.

## Configuration

Configuration files are loaded in this order:

1. Project: `.pi/adaptive-thinking.json`
2. Global: `~/.pi/agent/adaptive-thinking.json`
3. Built-in defaults

Project configuration takes precedence over global configuration.

```json
{
  "enabled": true,
  "quiet": false,
  "toolName": "set_reasoning_effort",
  "toolDescription": "Set your reasoning effort",
  "systemPrompt": "You MUST manage reasoning effort actively. Lower it before trivial or routine turns; raise it for ambiguity, debugging, risky changes, or multi-step synthesis. Reassess at turn start, after meaningful new evidence, and when the task shifts. NEVER leave the current level unchanged by inertia, and NEVER reply to a trivial turn before considering a downshift."
}
```

## Development

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run all checks:

```bash
pnpm verify
```

````

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
````

Expected: all commands pass.

- [ ] **Step 3: Fix verification failures with minimal changes**

If formatting fails, run:

```bash
pnpm format
```

Then rerun:

```bash
pnpm format:check
```

If lint/type/test/build fails, fix the exact reported issue and rerun the failing command, then rerun full verification.

- [ ] **Step 4: Commit README and verification fixes**

Run:

```bash
git add README.md src package.json pnpm-lock.yaml tsconfig.json tsconfig.build.json rolldown.config.ts .oxlintrc.json .oxfmtrc.json .gitignore AGENTS.md
git commit -m "docs: document pi adaptive thinking"
```

Expected: commit succeeds.

---

## Self-Review Notes

Spec coverage:

- Package shape: Task 1.
- Config defaults and project/global loading: Task 2.
- Pi-native level discovery from `ctx.model` and `@earendil-works/pi-ai`: Task 3.
- Tool registration and temporary/persistent semantics: Task 4.
- System prompt injection: Task 4.
- Error handling: Task 2 invalid config, Task 4 invalid levels/setter/reset failures.
- Tests and verification: Tasks 2-5.
- Documentation: Task 5.

No placeholders remain. Type names are introduced before use: `AdaptiveThinkingConfig`, `PiThinkingLevel`, `ToolParameters`, and runtime state are defined in earlier implementation steps before dependent code uses them.

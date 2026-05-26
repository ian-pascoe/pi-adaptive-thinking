import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import lockfile from "proper-lockfile";
import type {
  AgentToolResult,
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { type Static, Type } from "typebox";
import { loadConfig, type AdaptiveThinkingConfig } from "./config-loader";
import {
  isThinkingLevel,
  resolveSupportedThinkingLevels,
  type PiThinkingLevel,
} from "./thinking-levels";

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

const agentDir = () => process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");

const globalSettingsPath = () => join(agentDir(), "settings.json");

const sleepSync = (milliseconds: number) => {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) {
    // Synchronous ExtensionAPI methods require a synchronous retry loop.
  }
};

const acquireSettingsLock = (lockPath: string) => {
  const maxAttempts = 100;
  const delayMs = 20;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return lockfile.lockSync(lockPath, { realpath: false });
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
      if (code !== "ELOCKED" || attempt === maxAttempts) throw error;
      sleepSync(delayMs);
    }
  }

  throw new Error(`Failed to acquire settings lock: ${lockPath}`);
};

const withSettingsLock = <T>(settingsPath: string, fn: () => T): T => {
  mkdirSync(join(settingsPath, ".."), { recursive: true });
  const lockPath = `${settingsPath}.adaptive-thinking`;
  if (!existsSync(lockPath)) writeFileSync(lockPath, "");

  const release = acquireSettingsLock(lockPath);

  try {
    return fn();
  } finally {
    release();
  }
};

const readDefaultThinkingLevel = (settingsPath: string): PiThinkingLevel | undefined => {
  if (!existsSync(settingsPath)) return undefined;

  try {
    const parsed = JSON.parse(readFileSync(settingsPath, "utf-8")) as {
      defaultThinkingLevel?: unknown;
    };
    return typeof parsed.defaultThinkingLevel === "string" &&
      isThinkingLevel(parsed.defaultThinkingLevel)
      ? parsed.defaultThinkingLevel
      : undefined;
  } catch {
    return undefined;
  }
};

const restoreDefaultThinkingLevel = (
  settingsPath: string,
  previousDefaultThinkingLevel: PiThinkingLevel | undefined,
) => {
  if (!existsSync(settingsPath)) return;

  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
    if (previousDefaultThinkingLevel === undefined) {
      delete settings.defaultThinkingLevel;
    } else {
      settings.defaultThinkingLevel = previousDefaultThinkingLevel;
    }
    writeFileSync(settingsPath, JSON.stringify(settings, undefined, 2) + "\n");
  } catch {
    return;
  }
};

const withSessionOnlyThinkingLevelChange = (changeThinkingLevel: () => void) => {
  const settingsPath = globalSettingsPath();

  return withSettingsLock(settingsPath, () => {
    const previousDefaultThinkingLevel = readDefaultThinkingLevel(settingsPath);

    changeThinkingLevel();

    restoreDefaultThinkingLevel(settingsPath, previousDefaultThinkingLevel);
  });
};

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
      withSessionOnlyThinkingLevelChange(() => pi.setThinkingLevel(resetLevel));
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
    runtime = { config };
    if (isThinkingLevel(initialLevel)) runtime.currentLevel = initialLevel;

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
          withSessionOnlyThinkingLevelChange(() => pi.setThinkingLevel(level));
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

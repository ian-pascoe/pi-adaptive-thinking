import type {
  AgentToolResult,
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { type Static, Type } from "typebox";
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
      notify(ctx, "error", `Failed to reset reasoning effort: ${errorMessage(error)}`, state.config);
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

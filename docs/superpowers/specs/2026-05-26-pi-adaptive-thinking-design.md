# Pi Adaptive Thinking Design

Date: 2026-05-26

## Goal

Create `pi-adaptive-thinking`, a Pi-native extension/package that duplicates the user-facing behavior of `opencode-adaptive-thinking` for the Pi coding agent.

The extension lets the agent actively adjust reasoning effort through a tool, while using Pi's native thinking-level APIs instead of OpenCode model-variant prompts.

## Scope

In scope:

- Build a distributable Pi package modeled after `pi-byterover`.
- Register a configurable `set_reasoning_effort` tool.
- Preserve OpenCode-compatible temporary and persistent behavior:
  - `persist: false`: change thinking level for the current agent turn, then restore the previous or baseline level.
  - `persist: true`: change thinking level for the session baseline.
- Inject system guidance that tells the agent when and how to adjust reasoning effort.
- Load configuration from project and global Pi config files.
- Add focused unit tests for runtime behavior.

Out of scope:

- Reimplementing OpenCode model variant internals.
- Adding custom TUI controls beyond notifications/status needed for errors.
- Persisting thinking-level state across Pi process restarts unless Pi already restores it.

## Recommended Approach

Use a Pi-native extension with parity semantics.

The OpenCode plugin changes model variants by sending synthetic prompts. Pi has native thinking-level support, including `thinking_level_select` events, `pi.getThinkingLevel()`, and `pi.setThinkingLevel()`. The Pi version should therefore keep the OpenCode tool/config/prompt interface where useful, but implement actual changes through Pi APIs.

This approach gives users familiar behavior while avoiding brittle OpenCode-specific assumptions.

## Package Shape

The repository should follow the `pi-byterover` package pattern:

- ESM TypeScript package.
- Runtime entrypoint: `src/index.ts`.
- Bundled output: `dist/index.js` via Rolldown.
- `package.json` includes:
  - `main`, `types`, and `exports` for library consumers.
  - `peerDependencies` on `@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai`, and `typebox` as needed.
  - `pi.extensions` pointing to `./dist/index.js`.
- Tests use Vitest and mocked Pi APIs.
- Formatting/linting/build scripts mirror `pi-byterover` where possible.

## Components

### `src/config.ts`

Defines defaults and schema for extension options.

Default values should mirror `opencode-adaptive-thinking`:

- `enabled: true`
- `quiet: false`
- `toolName: "set_reasoning_effort"`
- `toolDescription: "Set your reasoning effort"`
- `systemPrompt`: guidance requiring active management of reasoning effort.

The schema should reject invalid types and normalize missing config to defaults.

### `src/config-loader.ts`

Loads configuration from:

1. Project config: `.pi/adaptive-thinking.json`
2. Global config: `~/.pi/agent/adaptive-thinking.json`
3. Defaults if neither exists

Project config takes precedence over global config. Invalid JSON or schema failures should return a structured error rather than throwing through Pi event handlers.

### `src/index.ts`

Exports the default Pi extension factory.

Responsibilities:

- Load config on `session_start`.
- Register the configured tool if enabled.
- Inject adaptive-thinking system guidance in `before_agent_start`.
- Track current thinking level from `pi.getThinkingLevel()` and `thinking_level_select`.
- Call Pi's native thinking-level setter from the tool.
- Restore temporary level changes after `agent_end`.

### Tests

Focused tests should cover behavior without requiring a real Pi session.

Minimum test files:

- `src/config.test.ts` or config-loader tests.
- `src/index.test.ts` for extension runtime behavior.

## Runtime State

The extension should maintain per-session runtime state:

```ts
type RuntimeState = {
  config: AdaptiveThinkingConfig;
  currentLevel?: string;
  persistedLevel?: string;
  temporaryResetLevel?: string;
};
```

Semantics:

- `currentLevel` tracks the latest level observed or set.
- `persistedLevel` is the session baseline for persistent changes.
- `temporaryResetLevel` is set when a non-persistent change needs to be restored after the current turn.

When `persist: true`, set `persistedLevel` to the requested level and clear `temporaryResetLevel`.

When `persist: false`, capture the reset level from `persistedLevel`, `currentLevel`, or `pi.getThinkingLevel()`. If the reset level differs from the requested level, store it in `temporaryResetLevel`.

On `agent_end`, if `temporaryResetLevel` exists, restore it with `pi.setThinkingLevel()`, update `currentLevel`, and clear `temporaryResetLevel` only after a successful reset.

## Tool Contract

Default name: `set_reasoning_effort`

Parameters:

- `level: string`
  - The reasoning effort / thinking level to apply.
- `persist?: boolean`
  - Defaults to `false`.
  - `false`: apply for the current turn only.
  - `true`: persist as the session baseline.

Result text:

- Success: `Reasoning effort set to <level>`
- Invalid level: `Invalid reasoning effort level: <level>. Valid levels: ...`
- No known levels: `Failed to set reasoning effort: no valid reasoning effort levels are available for this session`
- API failure: `Failed to set reasoning effort: <error>`

The tool should use TypeBox schemas, following Pi extension conventions.

## Valid Level Resolution

Pi's public extension API exposes `pi.getThinkingLevel()` and `pi.setThinkingLevel(level)`. The setter clamps to model capabilities and emits `thinking_level_select`. The extension API does not currently expose `AgentSession.getAvailableThinkingLevels()` directly.

For valid-level discovery, use the current `ctx.model` plus `@earendil-works/pi-ai`'s `getSupportedThinkingLevels(model)` helper. Pi model metadata uses `thinkingLevelMap` with keys `off`, `minimal`, `low`, `medium`, `high`, and `xhigh`; `null` marks unsupported levels. If `ctx.model` is unavailable, fall back to the full Pi level list: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`.

The tool should validate against the discovered list before calling `pi.setThinkingLevel()`. The setter may still clamp internally on model changes; `thinking_level_select` should remain the source of truth after changes.

The system prompt should include the discovered valid levels.

## System Prompt Injection

During `before_agent_start`, append the configured system prompt plus runtime guidance:

- Current reasoning effort level, if known.
- Valid reasoning effort levels, if known.
- Instruction to use the configured tool to change reasoning effort.
- Instruction to only call the tool when task complexity justifies changing levels.

The default base prompt should preserve the OpenCode plugin's intent:

> You MUST manage reasoning effort actively. Lower it before trivial or routine turns; raise it for ambiguity, debugging, risky changes, or multi-step synthesis. Reassess at turn start, after meaningful new evidence, and when the task shifts. NEVER leave the current level unchanged by inertia, and NEVER reply to a trivial turn before considering a downshift.

## Error Handling

- Invalid config:
  - Notify the user unless `quiet` is true and UI is available.
  - Log when a logging path is available.
  - Disable the extension for that session.
- Invalid level:
  - Return a clear tool result; do not call `pi.setThinkingLevel()`.
- Thinking-level setter failure:
  - Return a clear failure result.
  - Do not update runtime state as if the change succeeded.
- Reset failure after a temporary change:
  - Notify/log where available.
  - Keep state conservative so the extension does not claim reset success.

## Testing Plan

Unit tests should verify:

1. Defaults are applied when no config exists.
2. Project config overrides global config.
3. Disabled config prevents tool registration and prompt injection.
4. Invalid config disables the extension and reports an error.
5. Tool registers with the default name and schema.
6. Persistent tool call sets the requested level and records it as baseline.
7. Temporary tool call sets requested level and restores the prior/baseline level on `agent_end`.
8. Temporary call with same reset level does not schedule unnecessary reset.
9. `thinking_level_select` updates cached current level.
10. `before_agent_start` injects base guidance, tool name, current level, and valid levels when available.
11. Invalid level returns a safe error and does not mutate state.
12. Setter failure returns a safe error and does not commit state.

Verification commands should mirror `pi-byterover`:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Research Findings

Confirmed Pi APIs and docs:

- `pi.getThinkingLevel()` returns the current level.
- `pi.setThinkingLevel(level)` sets the level, clamps to model capabilities, records the change only if it actually changes, and emits `thinking_level_select`.
- `thinking_level_select` carries `level` and `previousLevel`.
- Pi thinking levels are `off`, `minimal`, `low`, `medium`, `high`, and `xhigh`.
- Model metadata uses `thinkingLevelMap`; omitted keys are supported with default provider mapping, and `null` hides/skips unsupported levels.
- `@earendil-works/pi-ai` exports `getSupportedThinkingLevels(model)` and `clampThinkingLevel(model, level)`.
- `ctx.model` is available to extension handlers; `ctx.modelRegistry` can find models, but current-model metadata is already enough for level discovery.

## Implementation Notes

- Keep OpenCode compatibility at the user-facing layer, not the integration layer.
- Avoid hard-coding Pi internals throughout the codebase; isolate thinking-level discovery/setter wrappers.
- Do not edit `dist/` by hand.
- Add an `AGENTS.md` for the new repo once implementation begins, matching the package's actual shape and commands.
- Add a Changeset when the package becomes publishable or receives a user-facing change.

## Acceptance Criteria

The implementation is complete when:

- `pi-adaptive-thinking` can be installed or loaded as a Pi package.
- The agent sees guidance telling it to manage reasoning effort.
- The agent can call `set_reasoning_effort` to change Pi thinking level.
- `persist: false` restores the previous/baseline level after the turn.
- `persist: true` keeps the chosen level as the session baseline.
- Invalid config and invalid levels fail safely.
- Relevant tests, linting, typechecking, and build pass.

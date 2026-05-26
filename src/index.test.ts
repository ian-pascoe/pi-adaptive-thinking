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

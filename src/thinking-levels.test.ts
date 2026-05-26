import { describe, expect, test } from "vitest";
import {
  fallbackThinkingLevels,
  isThinkingLevel,
  resolveSupportedThinkingLevels,
} from "./thinking-levels";

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

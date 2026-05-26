import { describe, expect, test } from "vitest";
import { configDefaults, defaultSystemPrompt, parseConfig } from "./config.js";

describe("parseConfig", () => {
  test("uses defaults when input is undefined", () => {
    expect(parseConfig(undefined)).toEqual(configDefaults);
  });

  test("merges partial config with defaults", () => {
    expect(parseConfig({ toolName: "think_harder" })).toEqual({
      ...configDefaults,
      toolName: "think_harder",
    });
  });

  test("rejects invalid config types", () => {
    expect(() => parseConfig({ enabled: "yes" })).toThrow();
  });

  test("rejects additional config properties", () => {
    expect(() => parseConfig({ unknown: true })).toThrow();
  });

  test("default prompt requires active reasoning management", () => {
    expect(defaultSystemPrompt).toContain("manage reasoning effort actively");
    expect(defaultSystemPrompt).toContain("NEVER leave the current level unchanged by inertia");
  });
});

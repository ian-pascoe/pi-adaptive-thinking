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

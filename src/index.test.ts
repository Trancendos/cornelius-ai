import { describe, expect, it } from "vitest";
import { CorneliusAiService } from "./index";

describe("CorneliusAiService", () => {
  it("returns active status payload", () => {
    const service = new CorneliusAiService();
    expect(service.getStatus()).toEqual({
      name: "cornelius-ai",
      status: "active",
    });
  });
});

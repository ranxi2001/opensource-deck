import { describe, expect, it } from "vitest";
import {
  decryptPayload,
  encryptPayload,
  isAllowedReturnTo,
} from "../src/index";

const secret = "test-session-secret-that-is-long-enough-123456";

describe("worker session boundary", () => {
  it("round-trips encrypted state without exposing plaintext", async () => {
    const encrypted = await encryptPayload(
      { accessToken: "gho_private", expiresAt: 42 },
      secret,
    );
    expect(encrypted).not.toContain("gho_private");
    await expect(decryptPayload(encrypted, secret)).resolves.toEqual({
      accessToken: "gho_private",
      expiresAt: 42,
    });
  });

  it("rejects a tampered session", async () => {
    const encrypted = await encryptPayload({ state: "expected" }, secret);
    const changed = `${encrypted.slice(0, -2)}aa`;
    await expect(decryptPayload(changed, secret)).rejects.toThrow();
  });

  it("accepts exact origins and rejects lookalike return URLs", () => {
    const env = {
      ALLOWED_ORIGINS: "https://ranxi2001.github.io,http://localhost:4173",
    };
    expect(
      isAllowedReturnTo("https://ranxi2001.github.io/opensource-deck/", env),
    ).toBe(true);
    expect(
      isAllowedReturnTo("https://ranxi2001.github.io.attacker.example/", env),
    ).toBe(false);
    expect(isAllowedReturnTo("javascript:alert(1)", env)).toBe(false);
  });
});

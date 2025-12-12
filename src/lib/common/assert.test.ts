import { describe, it, expect, mock } from "bun:test";
import assert from "./assert";

describe("assert", () => {
  describe("truthy conditions", () => {
    it("does not throw for true", () => {
      expect(() => assert(true)).not.toThrow();
    });

    it("does not throw for truthy values", () => {
      expect(() => assert(1)).not.toThrow();
      expect(() => assert("string")).not.toThrow();
      expect(() => assert({})).not.toThrow();
      expect(() => assert([])).not.toThrow();
    });
  });

  describe("falsy conditions", () => {
    it("throws for false", () => {
      expect(() => assert(false)).toThrow();
    });

    it("throws for null", () => {
      expect(() => assert(null)).toThrow();
    });

    it("throws for undefined", () => {
      expect(() => assert(undefined)).toThrow();
    });

    it("throws for 0", () => {
      expect(() => assert(0)).toThrow();
    });

    it("throws for empty string", () => {
      expect(() => assert("")).toThrow();
    });
  });

  describe("error messages", () => {
    it("uses default message when none provided", () => {
      try {
        assert(false);
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect((e as Error).message).toBe("Assertion failed");
      }
    });

    it("uses string message when provided", () => {
      try {
        assert(false, "Custom error message");
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect((e as Error).message).toBe(
          "Assertion failed: Custom error message",
        );
      }
    });

    it("calls lazy function for message", () => {
      const messageFn = mock(() => "Lazy message");

      try {
        assert(false, messageFn);
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(messageFn).toHaveBeenCalled();
        expect((e as Error).message).toBe("Assertion failed: Lazy message");
      }
    });

    it("does not call lazy function when condition is truthy", () => {
      const messageFn = mock(() => "Should not be called");

      assert(true, messageFn);

      expect(messageFn).not.toHaveBeenCalled();
    });
  });

  describe("type narrowing", () => {
    it("narrows nullable types", () => {
      const value: string | null = "hello";
      assert(value !== null);
      // TypeScript now knows value is string
      expect(value.toUpperCase()).toBe("HELLO");
    });

    it("narrows undefined types", () => {
      const value: number | undefined = 42;
      assert(value !== undefined);
      // TypeScript now knows value is number
      expect(value.toFixed(2)).toBe("42.00");
    });
  });
});

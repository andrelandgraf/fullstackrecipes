import { describe, it, expect } from "bun:test";
import { readdir } from "fs/promises";
import path from "path";
import { getRegistryItems } from "@/lib/recipes/data";

/**
 * E2E tests for the shadcn registry files in public/r/.
 *
 * These tests verify:
 * 1. All registry items from data.tsx have corresponding JSON files
 * 2. Each JSON file has valid structure with name, files, and content
 * 3. All JSON files in public/r/ are properly formatted
 */

describe("Shadcn Registry (public/r/)", () => {
  const registryItems = getRegistryItems();

  describe("registry items from data.tsx have valid JSON files", () => {
    for (const item of registryItems) {
      it(`"${item.name}" has valid JSON file`, async () => {
        const filePath = path.join(
          process.cwd(),
          "public",
          "r",
          `${item.name}.json`,
        );
        const file = Bun.file(filePath);
        const exists = await file.exists();

        expect(exists).toBe(true);

        const content = await file.json();
        expect(content.name).toBe(item.name);
        expect(content.files).toBeDefined();
        expect(content.files.length).toBeGreaterThan(0);

        // Verify each file has content
        for (const fileEntry of content.files) {
          expect(fileEntry.content).toBeDefined();
          expect(typeof fileEntry.content).toBe("string");
          expect(fileEntry.content.length).toBeGreaterThan(0);
        }
      });
    }
  });

  describe("all JSON files in public/r/ are valid", () => {
    it("should have at least one registry file", async () => {
      const registryDir = path.join(process.cwd(), "public", "r");
      const files = await readdir(registryDir);
      const jsonFiles = files.filter(
        (f) => f.endsWith(".json") && f !== "registry.json",
      );
      expect(jsonFiles.length).toBeGreaterThan(0);
    });

    it("all JSON files have required shadcn registry fields", async () => {
      const registryDir = path.join(process.cwd(), "public", "r");
      const files = await readdir(registryDir);
      const jsonFiles = files.filter(
        (f) => f.endsWith(".json") && f !== "registry.json",
      );

      for (const filename of jsonFiles) {
        const filePath = path.join(registryDir, filename);
        const file = Bun.file(filePath);
        const content = await file.json();

        // Required fields for shadcn registry items
        expect(content.name).toBeDefined();
        expect(typeof content.name).toBe("string");
        expect(content.type).toBeDefined();
        expect(content.files).toBeDefined();
        expect(Array.isArray(content.files)).toBe(true);
      }
    });
  });

  describe("registry.json index file", () => {
    it("should exist and have valid structure", async () => {
      const filePath = path.join(process.cwd(), "public", "r", "registry.json");
      const file = Bun.file(filePath);
      const exists = await file.exists();

      expect(exists).toBe(true);

      const content = await file.json();
      expect(content.$schema).toBeDefined();
      expect(content.name).toBe("fullstackrecipes");
      expect(content.items).toBeDefined();
      expect(Array.isArray(content.items)).toBe(true);
    });

    it("registry.json items match individual JSON files", async () => {
      const registryPath = path.join(
        process.cwd(),
        "public",
        "r",
        "registry.json",
      );
      const registryFile = Bun.file(registryPath);
      const registry = await registryFile.json();

      for (const item of registry.items) {
        const itemPath = path.join(
          process.cwd(),
          "public",
          "r",
          `${item.name}.json`,
        );
        const itemFile = Bun.file(itemPath);
        const exists = await itemFile.exists();

        expect(exists).toBe(true);
      }
    });
  });
});

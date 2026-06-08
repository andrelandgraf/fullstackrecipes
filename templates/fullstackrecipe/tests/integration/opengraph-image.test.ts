import { describe, it, expect } from "bun:test";
import Image, { alt, size, contentType } from "@/app/opengraph-image";

describe("opengraph-image", () => {
  it("exports the expected metadata", () => {
    expect(alt).toBe("Fullstack Recipe Template");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("renders a 1200x630 PNG image response", async () => {
    const response = await Image();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("image/png");
  });
});

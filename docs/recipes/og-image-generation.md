# OG Image Generation

Generate dynamic social preview images (Open Graph images) for pages using Next.js file conventions and the `next/og` library. Images are rendered server-side using JSX and cached at build time or on-demand.

## File Structure

```
src/app/
  opengraph-image.tsx          # Root route OG image
  recipes/
    [slug]/
      opengraph-image.tsx      # Dynamic OG image per recipe
      page.tsx
```

---

## Setup

### Step 1: Create a static OG image

Create `src/app/opengraph-image.tsx` for the root route:

```tsx
// src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const alt = "My App - Tagline description";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1>My App</h1>
        <p style={{ fontSize: "32px", color: "rgba(255,255,255,0.6)" }}>
          Tagline description
        </p>
      </div>
    ),
    { ...size },
  );
}
```

### Step 2: Create dynamic OG images for routes

Create `src/app/[slug]/opengraph-image.tsx` for dynamic routes:

```tsx
// src/app/posts/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getPostBySlug, getAllPosts } from "@/lib/posts/data";

export const alt = "Post Preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#0a0a0b",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "48px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Post Not Found
        </div>
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "50px 60px",
        }}
      >
        <h1
          style={{
            fontSize: "58px",
            fontWeight: 700,
            color: "white",
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            margin: 0,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {post.title}
        </h1>
        <p
          style={{
            fontSize: "24px",
            color: "rgba(255,255,255,0.5)",
            margin: 0,
            marginTop: "24px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {post.description}
        </p>
      </div>
    ),
    { ...size },
  );
}
```

### Step 3: Include local assets (logos, images)

Load local assets from the `public` folder and convert to base64:

```tsx
// src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "My App";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Load SVG from public folder
  const logoPath = join(process.cwd(), "public", "logo-dark.svg");
  const logoData = await readFile(logoPath, "utf-8");
  const logoBase64 = `data:image/svg+xml;base64,${Buffer.from(logoData).toString("base64")}`;

  // Load PNG from public folder
  const iconPath = join(process.cwd(), "public", "icon.png");
  const iconData = await readFile(iconPath);
  const iconBase64 = `data:image/png;base64,${iconData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px",
        }}
      >
        <img src={logoBase64} alt="Logo" height={64} />
        <img src={iconBase64} alt="Icon" width={48} height={48} />
      </div>
    ),
    { ...size },
  );
}
```

---

## Usage

### Exported metadata

Every `opengraph-image.tsx` file should export these constants:

```tsx
// Alt text for accessibility and when image fails to load
export const alt = "Description of the image";

// Standard OG image dimensions (1200x630 is recommended)
export const size = {
  width: 1200,
  height: 630,
};

// Image format (png or jpeg)
export const contentType = "image/png";
```

### JSX styling constraints

`ImageResponse` uses Satori under the hood which has specific CSS limitations:

```tsx
// REQUIRED: All elements need display: flex or display: none
<div style={{ display: "flex" }}>Content</div>

// REQUIRED: Use inline styles only (no className)
<div style={{ color: "white", fontSize: "24px" }}>Text</div>

// SUPPORTED: Common CSS properties
style={{
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  margin: "12px",
  gap: "16px",
  background: "#0a0a0b",
  color: "white",
  fontSize: "24px",
  fontWeight: 700,
  fontFamily: "system-ui, sans-serif",
  lineHeight: 1.5,
  letterSpacing: "-0.02em",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  position: "relative",
  overflow: "hidden",
}}

// NOT SUPPORTED: Complex CSS features
// - CSS Grid (use flexbox instead)
// - calc() in most contexts
// - CSS variables
// - Pseudo-elements (::before, ::after)
// - Animations/transitions
```

### Adding decorative elements

Create visual interest with SVG patterns and gradients:

```tsx
<div
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
  }}
>
  <svg style={{ width: "100%", height: "100%", opacity: 0.1 }}>
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path
          d="M 40 0 L 0 0 0 40"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.5"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
</div>
```

### Adding gradient backgrounds

```tsx
<div
  style={{
    background:
      "linear-gradient(145deg, #0f0f12 0%, #0a0a0b 50%, #08080a 100%)",
    width: "100%",
    height: "100%",
    display: "flex",
  }}
>
  {/* Ambient glow effect */}
  <div
    style={{
      position: "absolute",
      top: "-120px",
      left: "-80px",
      width: "500px",
      height: "500px",
      background:
        "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
      display: "flex",
    }}
  />
</div>
```

### Static generation for dynamic routes

Use `generateStaticParams` to pre-render OG images at build time:

```tsx
export async function generateStaticParams() {
  const items = getAllItems();
  return items.map((item) => ({
    slug: item.slug,
  }));
}
```

### Testing OG images locally

Visit the OG image directly in the browser during development:

```
http://localhost:3000/opengraph-image
http://localhost:3000/posts/my-post/opengraph-image
```

### Adding tags/badges

```tsx
{
  item.tags.length > 0 && (
    <div style={{ display: "flex", gap: "10px" }}>
      {item.tags.slice(0, 4).map((tag) => (
        <span
          key={tag}
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "#6ee7b7",
            background: "rgba(110, 231, 183, 0.12)",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "1px solid rgba(110, 231, 183, 0.25)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
```

### Code preview with syntax highlighting

For displaying code snippets with basic syntax highlighting:

```tsx
type Token = { type: string; value: string };

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    // Check for keywords
    const keywordMatch = remaining.match(
      /^(const|let|var|function|async|await|return|export|import|from)\b/,
    );
    if (keywordMatch) {
      tokens.push({ type: "keyword", value: keywordMatch[0] });
      remaining = remaining.slice(keywordMatch[0].length);
      continue;
    }

    // Check for strings
    const stringMatch = remaining.match(/^(["'`])(?:(?!\1)[^\\]|\\.)*\1/);
    if (stringMatch) {
      tokens.push({ type: "string", value: stringMatch[0] });
      remaining = remaining.slice(stringMatch[0].length);
      continue;
    }

    // Default: single character
    tokens.push({ type: "text", value: remaining[0] });
    remaining = remaining.slice(1);
  }

  return tokens;
}

function getTokenColor(type: string): string {
  switch (type) {
    case "keyword":
      return "#c678dd";
    case "string":
      return "#98c379";
    case "number":
      return "#d19a66";
    case "function":
      return "#61afef";
    default:
      return "rgba(255,255,255,0.85)";
  }
}

// Usage in ImageResponse
{
  codeLines.map((line, i) => {
    const tokens = tokenizeLine(line);
    return (
      <div
        key={i}
        style={{
          display: "flex",
          fontSize: "18px",
          fontFamily: "monospace",
          lineHeight: 1.6,
        }}
      >
        {tokens.map((token, j) => (
          <span
            key={j}
            style={{
              color: getTokenColor(token.type),
              whiteSpace: "pre",
            }}
          >
            {token.value}
          </span>
        ))}
      </div>
    );
  });
}
```

---

## References

- [Next.js Metadata Files: opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- [Vercel OG Image Generation](https://vercel.com/docs/functions/og-image-generation)
- [Satori (underlying library)](https://github.com/vercel/satori)

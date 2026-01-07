import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getRecipeBySlug,
  getCookbookBySlug,
  getAllRecipes,
  getAllCookbooks,
} from "@/lib/recipes/data";

// Simple syntax highlighting for code preview
type Token = { type: string; value: string };

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    let matched = false;

    // Check for comments
    const commentMatch = remaining.match(/^(\/\/.*$|\/\*[\s\S]*?\*\/)/);
    if (commentMatch) {
      tokens.push({ type: "comment", value: commentMatch[0] });
      remaining = remaining.slice(commentMatch[0].length);
      matched = true;
      continue;
    }

    // Check for strings
    const stringMatch = remaining.match(/^(["'`])(?:(?!\1)[^\\]|\\.)*\1/);
    if (stringMatch) {
      tokens.push({ type: "string", value: stringMatch[0] });
      remaining = remaining.slice(stringMatch[0].length);
      matched = true;
      continue;
    }

    // Check for keywords
    const keywordMatch = remaining.match(
      /^(const|let|var|function|async|await|return|export|import|from|if|else|for|while|new|class|extends|implements|interface|type|enum|public|private|protected|static|readonly|as|typeof|instanceof|in|of|true|false|null|undefined|this|super|try|catch|finally|throw|default)\b/,
    );
    if (keywordMatch) {
      tokens.push({ type: "keyword", value: keywordMatch[0] });
      remaining = remaining.slice(keywordMatch[0].length);
      matched = true;
      continue;
    }

    // Check for numbers
    const numberMatch = remaining.match(/^\b(\d+\.?\d*)\b/);
    if (numberMatch) {
      tokens.push({ type: "number", value: numberMatch[0] });
      remaining = remaining.slice(numberMatch[0].length);
      matched = true;
      continue;
    }

    // Check for function calls (identifier followed by parenthesis)
    const funcMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/);
    if (funcMatch) {
      tokens.push({ type: "function", value: funcMatch[1] });
      remaining = remaining.slice(funcMatch[1].length);
      matched = true;
      continue;
    }

    // Check for identifiers (variables, properties)
    const identMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (identMatch) {
      tokens.push({ type: "identifier", value: identMatch[0] });
      remaining = remaining.slice(identMatch[0].length);
      matched = true;
      continue;
    }

    // Check for punctuation/operators
    const punctMatch = remaining.match(/^[{}()\[\];:,.<>=!+\-*/%&|^~?@#]/);
    if (punctMatch) {
      tokens.push({ type: "punctuation", value: punctMatch[0] });
      remaining = remaining.slice(1);
      matched = true;
      continue;
    }

    // Whitespace or other
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
    case "comment":
      return "rgba(255,255,255,0.35)";
    case "identifier":
      return "#e5c07b";
    case "punctuation":
      return "rgba(255,255,255,0.5)";
    default:
      return "rgba(255,255,255,0.85)";
  }
}

export const alt = "Fullstack Recipes";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export async function generateStaticParams() {
  const recipes = getAllRecipes();
  const cookbooks = getAllCookbooks();
  return [...recipes, ...cookbooks].map((item) => ({
    slug: item.slug,
  }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getRecipeBySlug(slug) ?? getCookbookBySlug(slug);

  const logoPath = join(process.cwd(), "public", "logo-dark.svg");
  const logoData = await readFile(logoPath, "utf-8");
  const logoBase64 = `data:image/svg+xml;base64,${Buffer.from(logoData).toString("base64")}`;

  if (!item) {
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
          Recipe Not Found
        </div>
      ),
      { ...size },
    );
  }

  const codeLines = item.previewCode.split("\n");

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
          position: "relative",
        }}
      >
        {/* Grid pattern background */}
        <div
          style={{
            position: "absolute",
            top: "50px",
            left: "60px",
            right: "60px",
            bottom: "50px",
            display: "flex",
          }}
        >
          <svg
            style={{
              width: "100%",
              height: "100%",
              opacity: 0.12,
            }}
          >
            <defs>
              <pattern
                id="grid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="0.5"
                />
              </pattern>
              <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="15%" stopColor="white" stopOpacity="1" />
                <stop offset="85%" stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
              <mask id="gridMask">
                <rect width="100%" height="100%" fill="url(#fade)" />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="url(#grid)"
              mask="url(#gridMask)"
            />
          </svg>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            zIndex: 1,
          }}
        >
          {/* Header with logo and tags */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "32px",
            }}
          >
            {/* Logo */}
            <img src={logoBase64} alt="Fullstack Recipes" height={44} />

            {/* Tags */}
            {item.tags.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                }}
              >
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
            )}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "58px",
              fontWeight: 700,
              color: "white",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              margin: 0,
              marginBottom: "18px",
              maxWidth: "950px",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {item.title}
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: "22px",
              color: "rgba(255,255,255,0.5)",
              margin: 0,
              maxWidth: "850px",
              lineHeight: 1.5,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {item.description}
          </p>
        </div>

        {/* Code snippet preview */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "rgba(0,0,0,0.6)",
            borderRadius: "14px",
            padding: "22px 28px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "#ff5f57",
              }}
            />
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "#febc2e",
              }}
            />
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "#28c840",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {codeLines.slice(0, 5).map((line, i) => {
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
            })}
            {codeLines.length > 5 && (
              <span
                style={{
                  fontSize: "16px",
                  fontFamily: "monospace",
                  color: "rgba(255,255,255,0.35)",
                  lineHeight: 1.6,
                }}
              >
                ...
              </span>
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

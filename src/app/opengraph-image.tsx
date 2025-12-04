import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt =
  "Fullstack Recipes - Guides and Patterns for Full Stack AI Apps";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const logoPath = join(process.cwd(), "public", "logo-dark.svg");
  const logoData = await readFile(logoPath, "utf-8");
  const logoBase64 = `data:image/svg+xml;base64,${Buffer.from(logoData).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(145deg, #0f0f12 0%, #0a0a0b 50%, #08080a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow - top left */}
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

        {/* Ambient glow - bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            right: "-100px",
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Grid pattern background */}
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
          <svg
            style={{
              width: "100%",
              height: "100%",
              opacity: 0.08,
            }}
          >
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="0.5"
                />
              </pattern>
              <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="0.2" />
                <stop offset="20%" stopColor="white" stopOpacity="1" />
                <stop offset="80%" stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0.2" />
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

        {/* Logo and tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            zIndex: 1,
          }}
        >
          <img src={logoBase64} alt="Fullstack Recipes" height={64} />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              fontSize: "38px",
              color: "rgba(255,255,255,0.55)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
            }}
          >
            <span>Guides and Patterns for</span>
            <span
              style={{
                color: "#34d399",
                fontWeight: 700,
              }}
            >
              Full Stack
            </span>
            <span>AI Apps</span>
          </div>
        </div>

        {/* Code snippet */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background:
              "linear-gradient(180deg, rgba(15,15,20,0.95) 0%, rgba(8,8,10,0.98) 100%)",
            borderRadius: "20px",
            padding: "32px 36px",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow:
              "0 24px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
            zIndex: 1,
            position: "relative",
          }}
        >
          {/* Subtle top edge highlight */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "20%",
              right: "20%",
              height: "1px",
              background:
                "linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)",
              display: "flex",
            }}
          />

          {/* Window controls */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "#ff5f57",
                boxShadow: "0 0 8px rgba(255,95,87,0.4)",
              }}
            />
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "#febc2e",
                boxShadow: "0 0 8px rgba(254,188,46,0.4)",
              }}
            />
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "#28c840",
                boxShadow: "0 0 8px rgba(40,200,64,0.4)",
              }}
            />
          </div>

          {/* Code content */}
          <pre
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "28px",
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.9)",
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: "pre",
            }}
          >
            <span style={{ display: "flex" }}>
              <span style={{ color: "#c678dd" }}>const</span>
              <span style={{ color: "#e5c07b" }}>{" { parts }"}</span>
              <span style={{ color: "#56b6c2" }}>{" = "}</span>
              <span style={{ color: "#c678dd" }}>await</span>
              <span style={{ color: "#61afef" }}>{" researchAgent"}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>.</span>
              <span style={{ color: "#98c379" }}>run</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>(</span>
              <span style={{ color: "#e5c07b" }}>history</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{", {"}</span>
            </span>
            <span style={{ display: "flex" }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{"  "}</span>
              <span style={{ color: "#e06c75" }}>maxSteps</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{": "}</span>
              <span style={{ color: "#d19a66" }}>10</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>,</span>
            </span>
            <span style={{ display: "flex" }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{"  "}</span>
              <span style={{ color: "#e06c75" }}>writable</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{": "}</span>
              <span style={{ color: "#98c379" }}>getWritable</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>(),</span>
            </span>
            <span style={{ display: "flex" }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{"});"}</span>
            </span>
          </pre>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

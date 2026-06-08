import { ImageResponse } from "next/og";

export const alt = "Fullstack Recipe Template";
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
          background:
            "linear-gradient(145deg, #0c1310 0%, #0a0a0b 55%, #08080a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 72px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-160px",
            right: "-120px",
            width: "620px",
            height: "620px",
            background:
              "radial-gradient(circle, rgba(34,197,128,0.18) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-180px",
            left: "-120px",
            width: "560px",
            height: "560px",
            background:
              "radial-gradient(circle, rgba(34,197,128,0.1) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(160deg, #34d399 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              fontWeight: 800,
              color: "#06150f",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            FR
          </div>
          <span
            style={{
              fontSize: "30px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            Fullstack Recipes
          </span>
        </div>
        <h1
          style={{
            fontSize: "76px",
            fontWeight: 800,
            color: "white",
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
            margin: 0,
            zIndex: 1,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Fullstack Recipe Template
        </h1>
        <p
          style={{
            fontSize: "32px",
            color: "rgba(255,255,255,0.55)",
            margin: 0,
            marginTop: "28px",
            maxWidth: "900px",
            lineHeight: 1.4,
            zIndex: 1,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Auth, AI chat, durable workflows, Stripe, and more — the full stack,
          batteries included.
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "44px",
            zIndex: 1,
          }}
        >
          {["Next.js", "Better Auth", "AI SDK", "Drizzle", "Stripe"].map(
            (tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "20px",
                  fontWeight: 500,
                  color: "#6ee7b7",
                  background: "rgba(110, 231, 183, 0.12)",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "1px solid rgba(110, 231, 183, 0.25)",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {tag}
              </span>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}

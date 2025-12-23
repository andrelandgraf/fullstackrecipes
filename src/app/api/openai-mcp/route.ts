import { openAiMcpHandler } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "content-type, mcp-session-id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
} as const;

function withCors(
  fn: (req: Request) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  return async (req) => {
    const res = await fn(req);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  };
}

export const OPTIONS = async () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const GET = withCors(openAiMcpHandler);
export const POST = withCors(openAiMcpHandler);
export const PUT = withCors(openAiMcpHandler);
export const DELETE = withCors(openAiMcpHandler);

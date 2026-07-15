import "server-only";

export function isLocalRequest(request: Request) {
  const host = new URL(request.url).hostname.replace(/^\[|\]$/g, "");
  const origin = request.headers.get("origin");
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  return localHost && (!origin || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin.startsWith("http://[::1]:"));
}

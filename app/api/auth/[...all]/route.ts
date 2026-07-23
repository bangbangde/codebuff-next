import { getRuntimeAuth } from "@/lib/auth/runtime";

export const runtime = "nodejs";

async function handleAuthRequest(request: Request): Promise<Response> {
  return getRuntimeAuth().handler(request);
}

export {
  handleAuthRequest as GET,
  handleAuthRequest as POST,
};

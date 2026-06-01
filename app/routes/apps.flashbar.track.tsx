import type { ActionFunctionArgs } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = session?.shop ?? url.searchParams.get("shop");

  if (!shop) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const payload = await request.json().catch(() => ({}));
  const type = payload.type === "click" ? "click" : "impression";
  const userAgent = request.headers.get("user-agent") || "";

  await prisma.ctaEvent.create({
    data: {
      shop,
      ctaId: typeof payload.ctaId === "string" ? payload.ctaId : null,
      type,
      device: detectDevice(userAgent),
      source: normalizeSource(payload.source),
      path: typeof payload.path === "string" ? payload.path.slice(0, 500) : "",
    },
  });

  return Response.json({ ok: true });
};

function detectDevice(userAgent: string) {
  const value = userAgent.toLowerCase();
  if (/ipad|tablet/.test(value)) return "tablet";
  if (/mobi|iphone|android/.test(value)) return "mobile";
  if (value) return "desktop";
  return "unknown";
}

function normalizeSource(value: unknown) {
  if (typeof value !== "string" || !value) return "direct";
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "direct";
}

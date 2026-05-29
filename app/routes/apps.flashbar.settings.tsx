import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const shop = session?.shop ?? new URL(request.url).searchParams.get("shop");

  if (!shop) {
    return Response.json({ error: "Missing shop" }, { status: 400 });
  }

  const setting = await prisma.bannerSetting.findUnique({
    where: { shop },
  });

  return Response.json({
    text: setting?.text ?? "Flash Sale!",
    targetDate: setting?.targetDate.toISOString() ?? defaultTargetDate(),
    isEvergreen: setting?.isEvergreen ?? false,
    minutesDuration: setting?.minutesDuration ?? 15,
    backgroundColor: setting?.backgroundColor ?? "#000000",
    textColor: setting?.textColor ?? "#ffffff",
    buttonText: setting?.buttonText ?? "Shop now",
    buttonUrl: setting?.buttonUrl ?? "",
    isEnabled: setting?.isEnabled ?? true,
  });
};

function defaultTargetDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}

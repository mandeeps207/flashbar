import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const shop = session?.shop ?? new URL(request.url).searchParams.get("shop");

  if (!shop) {
    return Response.json({ error: "Missing shop" }, { status: 400 });
  }

  const ctas = await prisma.announcementCta.findMany({
    where: { shop, isEnabled: true },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: 10,
  });

  const fallback = await prisma.bannerSetting.findUnique({ where: { shop } });
  const first = ctas[0];

  return Response.json(
    first
      ? {
          ctas: ctas.map((cta) => serializeCta(cta)),
          ...serializeCta(first),
        }
      : {
          text: fallback?.text ?? "Flash Sale!",
          targetDate: fallback?.targetDate.toISOString() ?? defaultTargetDate(),
          isEvergreen: fallback?.isEvergreen ?? false,
          minutesDuration: fallback?.minutesDuration ?? 15,
          backgroundColor: fallback?.backgroundColor ?? "#000000",
          textColor: fallback?.textColor ?? "#ffffff",
          buttonText: fallback?.buttonText ?? "Shop now",
          buttonUrl: fallback?.buttonUrl ?? "",
          isEnabled: fallback?.isEnabled ?? true,
          ctas: [],
        },
  );
};

function serializeCta(cta: {
  id: string;
  text: string;
  targetDate: Date;
  isEvergreen: boolean;
  minutesDuration: number;
  backgroundColor: string;
  textColor: string;
  buttonText: string;
  buttonUrl: string;
  isEnabled: boolean;
}) {
  return {
    id: cta.id,
    text: cta.text,
    targetDate: cta.targetDate.toISOString(),
    isEvergreen: cta.isEvergreen,
    minutesDuration: cta.minutesDuration,
    backgroundColor: cta.backgroundColor,
    textColor: cta.textColor,
    buttonText: cta.buttonText,
    buttonUrl: cta.buttonUrl,
    isEnabled: cta.isEnabled,
  };
}

function defaultTargetDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}

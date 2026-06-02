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
    select: {
      id: true,
      text: true,
      headingHtml: true,
      targetDate: true,
      isEvergreen: true,
      minutesDuration: true,
      displayType: true,
      placement: true,
      isSticky: true,
      stickyPosition: true,
      backgroundColor: true,
      textColor: true,
      timerBackground: true,
      timerTextColor: true,
      digitColor: true,
      labelColor: true,
      buttonBackground: true,
      buttonTextColor: true,
      buttonText: true,
      buttonUrl: true,
      borderRadius: true,
      isEnabled: true,
    },
    take: 10,
  });

  const first = ctas[0];

  if (first) {
    return settingsJson({
      ctas: ctas.map((cta) => serializeCta(cta)),
      ...serializeCta(first),
    });
  }

  const fallback = await prisma.bannerSetting.findUnique({
    where: { shop },
    select: {
      text: true,
      targetDate: true,
      isEvergreen: true,
      minutesDuration: true,
      backgroundColor: true,
      textColor: true,
      buttonText: true,
      buttonUrl: true,
      isEnabled: true,
    },
  });

  return settingsJson({
    text: fallback?.text ?? "Flash Sale!",
    targetDate: fallback?.targetDate.toISOString() ?? defaultTargetDate(),
    isEvergreen: fallback?.isEvergreen ?? false,
    minutesDuration: fallback?.minutesDuration ?? 15,
    headingHtml: fallback?.text ?? "Flash Sale!",
    displayType: "inline",
    placement: "theme_block",
    isSticky: false,
    stickyPosition: "top",
    backgroundColor: fallback?.backgroundColor ?? "#000000",
    textColor: fallback?.textColor ?? "#ffffff",
    timerBackground: "#111111",
    timerTextColor: "#ffffff",
    digitColor: "#ffffff",
    labelColor: "#d1d5db",
    buttonBackground: "#ffffff",
    buttonTextColor: "#000000",
    buttonText: fallback?.buttonText ?? "Shop now",
    buttonUrl: fallback?.buttonUrl ?? "",
    borderRadius: 6,
    isEnabled: fallback?.isEnabled ?? true,
    ctas: [],
  });
};

function serializeCta(cta: {
  id: string;
  text: string;
  headingHtml: string;
  targetDate: Date;
  isEvergreen: boolean;
  minutesDuration: number;
  displayType: string;
  placement: string;
  isSticky: boolean;
  stickyPosition: string;
  backgroundColor: string;
  textColor: string;
  timerBackground: string;
  timerTextColor: string;
  digitColor: string;
  labelColor: string;
  buttonBackground: string;
  buttonTextColor: string;
  buttonText: string;
  buttonUrl: string;
  borderRadius: number;
  isEnabled: boolean;
}) {
  return {
    id: cta.id,
    text: cta.text,
    headingHtml: cta.headingHtml,
    targetDate: cta.targetDate.toISOString(),
    isEvergreen: cta.isEvergreen,
    minutesDuration: cta.minutesDuration,
    displayType: cta.displayType,
    placement: cta.placement,
    isSticky: cta.isSticky,
    stickyPosition: cta.stickyPosition,
    backgroundColor: cta.backgroundColor,
    textColor: cta.textColor,
    timerBackground: cta.timerBackground,
    timerTextColor: cta.timerTextColor,
    digitColor: cta.digitColor,
    labelColor: cta.labelColor,
    buttonBackground: cta.buttonBackground,
    buttonTextColor: cta.buttonTextColor,
    buttonText: cta.buttonText,
    buttonUrl: cta.buttonUrl,
    borderRadius: cta.borderRadius,
    isEnabled: cta.isEnabled,
  };
}

function defaultTargetDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}

function settingsJson(body: unknown) {
  return Response.json(body, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=60",
    },
  });
}

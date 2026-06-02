import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic === "shop/redact") {
    await db.$transaction([
      db.ctaEvent.deleteMany({ where: { shop } }),
      db.announcementCta.deleteMany({ where: { shop } }),
      db.bannerSetting.deleteMany({ where: { shop } }),
      db.session.deleteMany({ where: { shop } }),
    ]);
  }

  // FlashBar doesn't store customer records. Customer privacy topics therefore
  // require no row-level deletion beyond acknowledging the verified webhook.
  return new Response();
};

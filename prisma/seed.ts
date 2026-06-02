import { prisma } from "../lib/prisma";

const shop = "mk-web-tech.myshopify.com";

async function main() {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 7);

  await prisma.announcementCta.upsert({
    where: { id: "seed_weekend_sale_timer" },
    update: {
      isEnabled: true,
      targetDate,
    },
    create: {
      id: "seed_weekend_sale_timer",
      shop,
      name: "Weekend sale timer",
      text: "Flash Sale!",
      headingHtml: "<strong>Flash Sale!</strong>",
      targetDate,
      isEvergreen: false,
      minutesDuration: 15,
      displayType: "inline",
      placement: "theme_block",
      isSticky: true,
      stickyPosition: "top",
      backgroundColor: "#000000",
      textColor: "#ffffff",
      timerBackground: "#111111",
      timerTextColor: "#ffffff",
      digitColor: "#ffffff",
      labelColor: "#d1d5db",
      buttonBackground: "#ffffff",
      buttonTextColor: "#000000",
      buttonText: "Shop now",
      buttonUrl: "/collections/all",
      borderRadius: 6,
      isEnabled: true,
      priority: 0,
    },
  });

  await prisma.ctaEvent.createMany({
    data: [
      {
        shop,
        ctaId: "seed_weekend_sale_timer",
        type: "impression",
        device: "desktop",
        source: "direct",
        path: "/",
      },
      {
        shop,
        ctaId: "seed_weekend_sale_timer",
        type: "impression",
        device: "mobile",
        source: "google",
        path: "/collections/all",
      },
      {
        shop,
        ctaId: "seed_weekend_sale_timer",
        type: "click",
        device: "mobile",
        source: "google",
        path: "/collections/all",
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

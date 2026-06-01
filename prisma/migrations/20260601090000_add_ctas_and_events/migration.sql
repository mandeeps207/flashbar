-- CreateTable
CREATE TABLE "AnnouncementCta" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main announcement',
    "text" TEXT NOT NULL DEFAULT 'Flash Sale!',
    "targetDate" TIMESTAMP(3) NOT NULL,
    "isEvergreen" BOOLEAN NOT NULL DEFAULT false,
    "minutesDuration" INTEGER NOT NULL DEFAULT 15,
    "backgroundColor" TEXT NOT NULL DEFAULT '#000000',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "buttonText" TEXT NOT NULL DEFAULT 'Shop now',
    "buttonUrl" TEXT NOT NULL DEFAULT '',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementCta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CtaEvent" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "ctaId" TEXT,
    "type" TEXT NOT NULL,
    "device" TEXT NOT NULL DEFAULT 'unknown',
    "source" TEXT NOT NULL DEFAULT 'direct',
    "path" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CtaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnouncementCta_shop_idx" ON "AnnouncementCta"("shop");

-- CreateIndex
CREATE INDEX "AnnouncementCta_shop_isEnabled_priority_idx" ON "AnnouncementCta"("shop", "isEnabled", "priority");

-- CreateIndex
CREATE INDEX "CtaEvent_shop_type_createdAt_idx" ON "CtaEvent"("shop", "type", "createdAt");

-- CreateIndex
CREATE INDEX "CtaEvent_ctaId_type_createdAt_idx" ON "CtaEvent"("ctaId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "CtaEvent" ADD CONSTRAINT "CtaEvent_ctaId_fkey" FOREIGN KEY ("ctaId") REFERENCES "AnnouncementCta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Copy legacy single-banner settings into the new CTA library.
INSERT INTO "AnnouncementCta" (
    "id",
    "shop",
    "name",
    "text",
    "targetDate",
    "isEvergreen",
    "minutesDuration",
    "backgroundColor",
    "textColor",
    "buttonText",
    "buttonUrl",
    "isEnabled",
    "priority",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy_' || "id",
    "shop",
    'Main announcement',
    "text",
    "targetDate",
    "isEvergreen",
    "minutesDuration",
    "backgroundColor",
    "textColor",
    "buttonText",
    "buttonUrl",
    "isEnabled",
    0,
    "createdAt",
    "updatedAt"
FROM "BannerSetting"
ON CONFLICT ("id") DO NOTHING;

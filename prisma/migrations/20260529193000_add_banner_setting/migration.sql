-- CreateTable
CREATE TABLE "BannerSetting" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT 'Flash Sale!',
    "targetDate" TIMESTAMP(3) NOT NULL,
    "isEvergreen" BOOLEAN NOT NULL DEFAULT false,
    "minutesDuration" INTEGER NOT NULL DEFAULT 15,
    "backgroundColor" TEXT NOT NULL DEFAULT '#000000',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "buttonText" TEXT NOT NULL DEFAULT 'Shop now',
    "buttonUrl" TEXT NOT NULL DEFAULT '',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BannerSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BannerSetting_shop_key" ON "BannerSetting"("shop");

-- CreateIndex
CREATE INDEX "BannerSetting_shop_idx" ON "BannerSetting"("shop");

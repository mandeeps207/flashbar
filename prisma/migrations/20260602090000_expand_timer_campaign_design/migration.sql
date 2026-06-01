ALTER TABLE "AnnouncementCta"
ADD COLUMN "headingHtml" TEXT NOT NULL DEFAULT 'Flash Sale!',
ADD COLUMN "displayType" TEXT NOT NULL DEFAULT 'inline',
ADD COLUMN "placement" TEXT NOT NULL DEFAULT 'theme_block',
ADD COLUMN "isSticky" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stickyPosition" TEXT NOT NULL DEFAULT 'top',
ADD COLUMN "timerBackground" TEXT NOT NULL DEFAULT '#111111',
ADD COLUMN "timerTextColor" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN "digitColor" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN "labelColor" TEXT NOT NULL DEFAULT '#d1d5db',
ADD COLUMN "buttonBackground" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN "buttonTextColor" TEXT NOT NULL DEFAULT '#000000',
ADD COLUMN "borderRadius" INTEGER NOT NULL DEFAULT 6;

UPDATE "AnnouncementCta"
SET "headingHtml" = "text"
WHERE "headingHtml" = 'Flash Sale!' AND "text" <> 'Flash Sale!';

import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  EmptyState,
  InlineGrid,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

type BreakdownRow = {
  label: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const navSearch = navigationSearch(request, session.shop);
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const since14 = new Date();
  since14.setDate(since14.getDate() - 14);

  const [ctas, eventTotals, deviceGroups, sourceGroups, ctaGroups, trendEvents] =
    await Promise.all([
      prisma.announcementCta.findMany({
        where: { shop: session.shop },
        orderBy: [
          { isEnabled: "desc" },
          { priority: "asc" },
          { createdAt: "desc" },
        ],
        select: { id: true, isEnabled: true, name: true, text: true },
        take: 50,
      }),
      prisma.ctaEvent.groupBy({
        by: ["type"],
        where: { shop: session.shop, createdAt: { gte: since30 } },
        _count: true,
      }),
      prisma.ctaEvent.groupBy({
        by: ["device", "type"],
        where: { shop: session.shop, createdAt: { gte: since30 } },
        _count: true,
      }),
      prisma.ctaEvent.groupBy({
        by: ["source", "type"],
        where: { shop: session.shop, createdAt: { gte: since30 } },
        _count: true,
      }),
      prisma.ctaEvent.groupBy({
        by: ["ctaId", "type"],
        where: { shop: session.shop, createdAt: { gte: since30 } },
        _count: true,
      }),
      prisma.ctaEvent.findMany({
        where: { shop: session.shop, createdAt: { gte: since14 } },
        select: { type: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const impressions = eventTotals.find((row) => row.type === "impression")?._count ?? 0;
  const clicks = eventTotals.find((row) => row.type === "click")?._count ?? 0;
  const ctaNames = new Map(ctas.map((cta) => [cta.id, cta.name || cta.text]));

  return {
    activeCtas: ctas.filter((cta) => cta.isEnabled).length,
    ctr: calculateCtr(clicks, impressions),
    clicks,
    deviceRows: summarizeGroups(deviceGroups, "device"),
    hasCtas: ctas.length > 0,
    impressions,
    sourceRows: summarizeGroups(sourceGroups, "source"),
    topCtas: summarizeCtaGroups(ctaGroups, ctaNames),
    totalCtas: ctas.length,
    trend: buildTrend(trendEvents),
    navSearch,
  };
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const goToCampaigns = () => window.location.assign(`/app/ctas${data.navSearch}`);
  const goToNewCampaign = () =>
    window.location.assign(`/app/ctas/new${data.navSearch}`);

  return (
    <Page
      title="FlashBar dashboard"
      subtitle="Track how countdown timer campaigns perform across storefront visitors."
      primaryAction={{ content: "Create campaign", onAction: goToNewCampaign }}
    >
      {!data.hasCtas ? (
        <Card>
          <EmptyState
            heading="Create your first timer campaign"
            action={{ content: "Create campaign", onAction: goToNewCampaign }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Add a countdown timer, heading, and button before tracking impressions,
              clicks, CTR, devices, and traffic sources.
            </p>
          </EmptyState>
        </Card>
      ) : (
        <BlockStack gap="500">
          <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
            <MetricCard label="Impressions" value={formatNumber(data.impressions)} />
            <MetricCard label="Clicks" value={formatNumber(data.clicks)} />
            <MetricCard label="CTR" value={`${data.ctr.toFixed(2)}%`} />
            <MetricCard
              label="Active campaigns"
              value={`${data.activeCtas}/${data.totalCtas}`}
            />
          </InlineGrid>

          <InlineGrid columns={{ xs: 1, lg: 2 }} gap="400">
            <TrendCard rows={data.trend} />
            <BreakdownCard title="Device performance" rows={data.deviceRows} />
          </InlineGrid>

          <InlineGrid columns={{ xs: 1, lg: 2 }} gap="400">
            <BreakdownCard title="Traffic source" rows={data.sourceRows} />
            <TopCtas onManage={goToCampaigns} rows={data.topCtas} />
          </InlineGrid>
        </BlockStack>
      )}
    </Page>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="p" tone="subdued">
          {label}
        </Text>
        <Text as="p" variant="heading2xl">
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}

function TrendCard({
  rows,
}: {
  rows: Array<{ label: string; impressions: number; clicks: number }>;
}) {
  const max = Math.max(1, ...rows.map((row) => row.impressions));

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text as="h2" variant="headingMd">
            14-day activity
          </Text>
          <Badge tone="info">Impressions vs clicks</Badge>
        </InlineStack>
        <div
          style={{
            alignItems: "end",
            display: "grid",
            gap: 8,
            gridTemplateColumns: `repeat(${rows.length}, minmax(6px, 1fr))`,
            minHeight: 180,
          }}
        >
          {rows.map((row) => (
            <div
              key={row.label}
              title={`${row.label}: ${row.impressions} views, ${row.clicks} clicks`}
              style={{ display: "grid", gap: 3 }}
            >
              <div
                style={{
                  alignItems: "end",
                  background: "#dfe3e8",
                  borderRadius: 6,
                  display: "flex",
                  height: 160,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "#008060",
                    height: `${Math.max(3, (row.impressions / max) * 100)}%`,
                    width: "100%",
                  }}
                />
              </div>
              <div
                style={{
                  background: "#2c6ecb",
                  borderRadius: 4,
                  height: Math.max(3, row.clicks ? 8 : 3),
                }}
              />
            </div>
          ))}
        </div>
      </BlockStack>
    </Card>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          {title}
        </Text>
        {rows.length === 0 ? (
          <Text as="p" tone="subdued">
            No traffic recorded yet.
          </Text>
        ) : (
          rows.map((row) => <BreakdownBar key={row.label} row={row} />)
        )}
      </BlockStack>
    </Card>
  );
}

function BreakdownBar({ row }: { row: BreakdownRow }) {
  const total = Math.max(row.impressions, 1);

  return (
    <BlockStack gap="100">
      <InlineStack align="space-between">
        <Text as="span" fontWeight="semibold">
          {row.label}
        </Text>
        <Text as="span" tone="subdued">
          {formatNumber(row.impressions)} views - {row.ctr.toFixed(2)}% CTR
        </Text>
      </InlineStack>
      <Box background="bg-fill-secondary" borderRadius="200" minHeight="10px">
        <div
          style={{
            background: "#008060",
            borderRadius: 8,
            height: 10,
            width: `${Math.max(4, (row.clicks / total) * 100)}%`,
          }}
        />
      </Box>
    </BlockStack>
  );
}

function TopCtas({
  onManage,
  rows,
}: {
  onManage: () => void;
  rows: BreakdownRow[];
}) {
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text as="h2" variant="headingMd">
            Top campaigns
          </Text>
          <Button onClick={onManage} variant="plain">
            Manage
          </Button>
        </InlineStack>
        {rows.length === 0 ? (
          <Text as="p" tone="subdued">
            Campaign performance will appear after storefront traffic starts.
          </Text>
        ) : (
          rows.map((row) => (
            <InlineStack key={row.label} align="space-between">
              <Link to="#">{row.label}</Link>
              <Text as="span" tone="subdued">
                {formatNumber(row.clicks)} clicks - {row.ctr.toFixed(2)}% CTR
              </Text>
            </InlineStack>
          ))
        )}
      </BlockStack>
    </Card>
  );
}

function summarizeGroups(
  groups: Array<{
    type: string;
    _count: number;
    device?: string;
    source?: string;
  }>,
  key: string,
) {
  const map = new Map<string, { impressions: number; clicks: number }>();

  for (const group of groups) {
    const label = titleize((key === "device" ? group.device : group.source) || "unknown");
    const current = map.get(label) ?? { impressions: 0, clicks: 0 };
    if (group.type === "click") current.clicks = group._count;
    if (group.type === "impression") current.impressions = group._count;
    map.set(label, current);
  }

  return Array.from(map.entries())
    .map(([label, values]) => ({
      label,
      ...values,
      ctr: calculateCtr(values.clicks, values.impressions),
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

function summarizeCtaGroups(
  groups: Array<{ ctaId: string | null; type: string; _count: number }>,
  names: Map<string, string>,
) {
  const map = new Map<string, { impressions: number; clicks: number }>();

  for (const group of groups) {
    const label = (group.ctaId && names.get(group.ctaId)) || "Deleted CTA";
    const current = map.get(label) ?? { impressions: 0, clicks: 0 };
    if (group.type === "click") current.clicks = group._count;
    if (group.type === "impression") current.impressions = group._count;
    map.set(label, current);
  }

  return Array.from(map.entries())
    .map(([label, values]) => ({
      label,
      ...values,
      ctr: calculateCtr(values.clicks, values.impressions),
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);
}

function buildTrend(events: Array<{ type: string; createdAt: Date }>) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
      impressions: 0,
      clicks: 0,
    };
  });
  const map = new Map(days.map((day) => [day.key, day]));

  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10);
    const day = map.get(key);
    if (!day) continue;
    if (event.type === "click") day.clicks += 1;
    if (event.type === "impression") day.impressions += 1;
  }

  return days;
}

function calculateCtr(clicks: number, impressions: number) {
  return impressions ? (clicks / impressions) * 100 : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function titleize(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function navigationSearch(request: Request, shop: string) {
  const search = new URL(request.url).search;
  return search || `?shop=${encodeURIComponent(shop)}`;
}

export const headers: HeadersFunction = (headersArgs) => {
  const headers = boundary.headers(headersArgs);
  headers.set("Cache-Control", "private, max-age=30");
  return headers;
};

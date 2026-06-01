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
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [ctas, impressions, clicks, events] = await Promise.all([
    prisma.announcementCta.findMany({
      where: { shop: session.shop },
      orderBy: [{ isEnabled: "desc" }, { priority: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.ctaEvent.count({
      where: { shop: session.shop, type: "impression", createdAt: { gte: since } },
    }),
    prisma.ctaEvent.count({
      where: { shop: session.shop, type: "click", createdAt: { gte: since } },
    }),
    prisma.ctaEvent.findMany({
      where: { shop: session.shop, createdAt: { gte: since } },
      select: {
        type: true,
        device: true,
        source: true,
        createdAt: true,
        cta: { select: { id: true, name: true, text: true, isEnabled: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const deviceRows = summarize(events, "device");
  const sourceRows = summarize(events, "source");
  const topCtas = summarizeCtas(events);
  const trend = buildTrend(events);

  return {
    hasCtas: ctas.length > 0,
    activeCtas: ctas.filter((cta) => cta.isEnabled).length,
    totalCtas: ctas.length,
    impressions,
    clicks,
    ctr: calculateCtr(clicks, impressions),
    deviceRows,
    sourceRows,
    topCtas,
    trend,
  };
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();

  return (
    <Page
      title="FlashBar dashboard"
      subtitle="Track how announcement CTAs perform across storefront visitors."
      primaryAction={{ content: "Create CTA", url: "/app/ctas" }}
    >
      {!data.hasCtas ? (
        <Card>
          <EmptyState
            heading="Create your first announcement CTA"
            action={{ content: "Create CTA", url: "/app/ctas" }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Add a promo bar, countdown, and button before tracking impressions,
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
              label="Active CTAs"
              value={`${data.activeCtas}/${data.totalCtas}`}
            />
          </InlineGrid>

          <InlineGrid columns={{ xs: 1, lg: 2 }} gap="400">
            <TrendCard rows={data.trend} />
            <BreakdownCard title="Device performance" rows={data.deviceRows} />
          </InlineGrid>

          <InlineGrid columns={{ xs: 1, lg: 2 }} gap="400">
            <BreakdownCard title="Traffic source" rows={data.sourceRows} />
            <TopCtas rows={data.topCtas} />
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
            30-day activity
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
          {formatNumber(row.impressions)} views · {row.ctr.toFixed(2)}% CTR
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

function TopCtas({ rows }: { rows: BreakdownRow[] }) {
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text as="h2" variant="headingMd">
            Top CTAs
          </Text>
          <Button url="/app/ctas" variant="plain">
            Manage
          </Button>
        </InlineStack>
        {rows.length === 0 ? (
          <Text as="p" tone="subdued">
            CTA performance will appear after storefront traffic starts.
          </Text>
        ) : (
          rows.map((row) => (
            <InlineStack key={row.label} align="space-between">
              <Link to="/app/ctas">{row.label}</Link>
              <Text as="span" tone="subdued">
                {formatNumber(row.clicks)} clicks · {row.ctr.toFixed(2)}% CTR
              </Text>
            </InlineStack>
          ))
        )}
      </BlockStack>
    </Card>
  );
}

function summarize(
  events: Array<{ type: string; device: string; source: string }>,
  key: "device" | "source",
) {
  const map = new Map<string, { impressions: number; clicks: number }>();

  for (const event of events) {
    const label = titleize(event[key] || "unknown");
    const current = map.get(label) ?? { impressions: 0, clicks: 0 };
    if (event.type === "click") current.clicks += 1;
    if (event.type === "impression") current.impressions += 1;
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

function summarizeCtas(
  events: Array<{
    type: string;
    cta: { name: string; text: string } | null;
  }>,
) {
  const map = new Map<string, { impressions: number; clicks: number }>();

  for (const event of events) {
    const label = event.cta?.name || event.cta?.text || "Deleted CTA";
    const current = map.get(label) ?? { impressions: 0, clicks: 0 };
    if (event.type === "click") current.clicks += 1;
    if (event.type === "impression") current.impressions += 1;
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
    return { key, label: date.toLocaleDateString("en", { month: "short", day: "numeric" }), impressions: 0, clicks: 0 };
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

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

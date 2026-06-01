import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData, useLocation } from "react-router";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  EmptyState,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const ctas = await prisma.announcementCta.findMany({
    where: { shop: session.shop },
    orderBy: [{ isEnabled: "desc" }, { priority: "asc" }, { createdAt: "desc" }],
  });

  const events = await prisma.ctaEvent.groupBy({
    by: ["ctaId", "type"],
    where: {
      shop: session.shop,
      ctaId: { in: ctas.map((cta) => cta.id) },
    },
    _count: true,
  });

  const metrics = new Map<string, { impressions: number; clicks: number }>();
  for (const event of events) {
    if (!event.ctaId) continue;
    const current = metrics.get(event.ctaId) ?? { impressions: 0, clicks: 0 };
    if (event.type === "impression") current.impressions = event._count;
    if (event.type === "click") current.clicks = event._count;
    metrics.set(event.ctaId, current);
  }

  return {
    ctas: ctas.map((cta) => {
      const ctaMetrics = metrics.get(cta.id) ?? { impressions: 0, clicks: 0 };
      return {
        id: cta.id,
        name: cta.name,
        text: cta.text,
        buttonText: cta.buttonText,
        buttonUrl: cta.buttonUrl,
        isEnabled: cta.isEnabled,
        isEvergreen: cta.isEvergreen,
        priority: cta.priority,
        updatedAt: cta.updatedAt.toLocaleDateString("en", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        impressions: ctaMetrics.impressions,
        clicks: ctaMetrics.clicks,
        ctr: calculateCtr(ctaMetrics.clicks, ctaMetrics.impressions),
      };
    }),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = String(formData.get("id") || "");

  if (!id) {
    return { ok: false, error: "Missing CTA id." };
  }

  await prisma.announcementCta.deleteMany({
    where: { id, shop: session.shop },
  });

  return { ok: true, message: "CTA deleted." };
};

export default function Ctas() {
  const { ctas } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const location = useLocation();
  const search = location.search;

  return (
    <Page
      title="CTA library"
      subtitle="Review all announcement CTAs, performance, status, and storefront priority."
      backAction={{ content: "Dashboard", url: `/app${search}` }}
      primaryAction={{ content: "Create CTA", url: `/app/ctas/new${search}` }}
    >
      <BlockStack gap="400">
        {actionData?.ok && <Banner tone="success">{actionData.message}</Banner>}
        {actionData && !actionData.ok && (
          <Banner tone="critical">{actionData.error}</Banner>
        )}

        {ctas.length === 0 ? (
          <Card>
            <EmptyState
              heading="No CTAs yet"
              action={{ content: "Create CTA", url: `/app/ctas/new${search}` }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Create your first announcement CTA and start tracking it.</p>
            </EmptyState>
          </Card>
        ) : (
          <Card padding="0">
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  minWidth: 980,
                  width: "100%",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #dfe3e8" }}>
                    <Th>CTA</Th>
                    <Th>Status</Th>
                    <Th>Mode</Th>
                    <Th>Priority</Th>
                    <Th>Impressions</Th>
                    <Th>Clicks</Th>
                    <Th>CTR</Th>
                    <Th>Updated</Th>
                    <Th align="right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {ctas.map((cta) => (
                    <tr key={cta.id} style={{ borderBottom: "1px solid #edf0f3" }}>
                      <Td>
                        <BlockStack gap="100">
                          <Text as="span" fontWeight="semibold">
                            {cta.name}
                          </Text>
                          <Text as="span" tone="subdued">
                            {cta.text}
                          </Text>
                          <Text as="span" tone="subdued">
                            {cta.buttonText} - {cta.buttonUrl || "No URL"}
                          </Text>
                        </BlockStack>
                      </Td>
                      <Td>
                        <Badge tone={cta.isEnabled ? "success" : undefined}>
                          {cta.isEnabled ? "Active" : "Paused"}
                        </Badge>
                      </Td>
                      <Td>{cta.isEvergreen ? "Evergreen" : "Fixed date"}</Td>
                      <Td>{cta.priority}</Td>
                      <Td>{formatNumber(cta.impressions)}</Td>
                      <Td>{formatNumber(cta.clicks)}</Td>
                      <Td>{cta.ctr.toFixed(2)}%</Td>
                      <Td>{cta.updatedAt}</Td>
                      <Td align="right">
                        <InlineStack align="end" gap="300" wrap={false}>
                          <Button
                            url={`/app/ctas/${cta.id}${search}`}
                            variant="plain"
                          >
                            Edit
                          </Button>
                          <Form method="post">
                            <input name="id" type="hidden" value={cta.id} />
                            <Button submit tone="critical" variant="plain">
                              Delete
                            </Button>
                          </Form>
                        </InlineStack>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}

function Th({
  align = "left",
  children,
}: {
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <th
      style={{
        color: "#616a75",
        fontSize: 12,
        fontWeight: 650,
        padding: "14px 16px",
        textAlign: align,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  align = "left",
  children,
}: {
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <td
      style={{
        padding: "14px 16px",
        textAlign: align,
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}

function calculateCtr(clicks: number, impressions: number) {
  return impressions ? (clicks / impressions) * 100 : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

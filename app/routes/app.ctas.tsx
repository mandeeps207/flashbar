import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  Link as RouterLink,
  useActionData,
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
} from "react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  EmptyState,
  InlineStack,
  Modal,
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
  const deleteFetcher = useFetcher<typeof action>();
  const location = useLocation();
  const navigate = useNavigate();
  const [campaignToDelete, setCampaignToDelete] = useState<null | {
    id: string;
    name: string;
  }>(null);
  const search = location.search;
  const goTo = (path: string) => navigate(`${path}${search}`);
  const isDeleting = deleteFetcher.state !== "idle";
  const deletedId = useMemo(() => {
    const formData = deleteFetcher.formData;
    const id = formData?.get("id");
    return typeof id === "string" ? id : "";
  }, [deleteFetcher.formData]);
  const visibleCampaigns = ctas.filter((cta) => cta.id !== deletedId);

  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data?.ok) {
      setCampaignToDelete(null);
    }
  }, [deleteFetcher.data, deleteFetcher.state]);

  return (
    <Page
      fullWidth
      title="Timer campaigns"
      subtitle="Manage countdown campaigns, placement, performance, and storefront priority."
      backAction={{ content: "Dashboard", onAction: () => goTo("/app") }}
      primaryAction={{
        content: "Create campaign",
        onAction: () => goTo("/app/ctas/new"),
      }}
    >
      <BlockStack gap="400">
        {actionData?.ok && <Banner tone="success">{actionData.message}</Banner>}
        {actionData && !actionData.ok && (
          <Banner tone="critical">{actionData.error}</Banner>
        )}
        {deleteFetcher.data && !deleteFetcher.data.ok && (
          <Banner tone="critical">{deleteFetcher.data.error}</Banner>
        )}

        {ctas.length === 0 ? (
          <Card>
            <EmptyState
              heading="No timer campaigns yet"
              action={{
                content: "Create campaign",
                onAction: () => goTo("/app/ctas/new"),
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>
                Create a countdown timer campaign for sale bars, product page
                urgency, or sticky top and bottom announcements.
              </p>
            </EmptyState>
          </Card>
        ) : (
          <Card padding="0">
            <div style={{ width: "100%" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                  width: "100%",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #dfe3e8" }}>
                    <Th width="30%">Campaign</Th>
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
                  {visibleCampaigns.map((cta) => (
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
                          <RouterLink
                            style={{ color: "#005bd3", textDecoration: "none" }}
                            to={`/app/ctas/${cta.id}${search}`}
                          >
                            Edit
                          </RouterLink>
                          <Button
                            disabled={isDeleting}
                            onClick={() =>
                              setCampaignToDelete({ id: cta.id, name: cta.name })
                            }
                            tone="critical"
                            variant="plain"
                          >
                            Delete
                          </Button>
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
      <Modal
        open={Boolean(campaignToDelete)}
        onClose={() => setCampaignToDelete(null)}
        title="Delete timer campaign?"
        primaryAction={{
          content: "Delete campaign",
          destructive: true,
          loading: isDeleting,
          onAction: () => {
            if (!campaignToDelete) return;
            deleteFetcher.submit(
              { id: campaignToDelete.id },
              { method: "post" },
            );
          },
        }}
        secondaryActions={[
          {
            content: "Cancel",
            disabled: isDeleting,
            onAction: () => setCampaignToDelete(null),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            This permanently removes {campaignToDelete?.name || "this campaign"}
            . Historical analytics events stay available for dashboard totals.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

function Th({
  align = "left",
  children,
  width,
}: {
  align?: "left" | "right";
  children: React.ReactNode;
  width?: string;
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
        width,
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
        wordBreak: "break-word",
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

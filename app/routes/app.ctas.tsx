import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineGrid,
  InlineStack,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

type CtaForm = {
  id?: string;
  name: string;
  text: string;
  targetDate: string;
  isEvergreen: boolean;
  minutesDuration: string;
  backgroundColor: string;
  textColor: string;
  buttonText: string;
  buttonUrl: string;
  priority: string;
  isEnabled: boolean;
};

const blankCta: CtaForm = {
  name: "Weekend sale",
  text: "Flash Sale!",
  targetDate: toDateTimeLocal(defaultTargetDate()),
  isEvergreen: false,
  minutesDuration: "15",
  backgroundColor: "#000000",
  textColor: "#ffffff",
  buttonText: "Shop now",
  buttonUrl: "/collections/all",
  priority: "0",
  isEnabled: true,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const ctas = await prisma.announcementCta.findMany({
    where: { shop: session.shop },
    orderBy: [{ isEnabled: "desc" }, { priority: "asc" }, { createdAt: "desc" }],
  });

  return {
    ctas: ctas.map((cta) => ({
      id: cta.id,
      name: cta.name,
      text: cta.text,
      targetDate: toDateTimeLocal(cta.targetDate),
      isEvergreen: cta.isEvergreen,
      minutesDuration: String(cta.minutesDuration),
      backgroundColor: cta.backgroundColor,
      textColor: cta.textColor,
      buttonText: cta.buttonText,
      buttonUrl: cta.buttonUrl,
      priority: String(cta.priority),
      isEnabled: cta.isEnabled,
    })),
    blankCta,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = stringValue(formData, "_intent", "save");
  const id = stringValue(formData, "id", "");

  if (intent === "delete") {
    if (!id) return { ok: false, error: "Missing CTA id." };
    await prisma.announcementCta.deleteMany({ where: { id, shop: session.shop } });
    return { ok: true, message: "CTA deleted." };
  }

  const data = parseCtaForm(formData);
  if (!data.ok) return data;

  if (id) {
    await prisma.announcementCta.updateMany({
      where: { id, shop: session.shop },
      data: data.value,
    });
    return { ok: true, message: "CTA updated." };
  }

  await prisma.announcementCta.create({
    data: {
      shop: session.shop,
      ...data.value,
    },
  });

  return { ok: true, message: "CTA created." };
};

export default function Ctas() {
  const { ctas, blankCta } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  return (
    <Page
      title="CTA library"
      subtitle="Create multiple announcement bars and choose which ones are active on the storefront."
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <BlockStack gap="500">
        {actionData?.ok && <Banner tone="success">{actionData.message}</Banner>}
        {actionData && !actionData.ok && (
          <Banner tone="critical">{actionData.error}</Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              New CTA
            </Text>
            <CtaEditor cta={blankCta} isSaving={isSaving} />
          </BlockStack>
        </Card>

        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text as="h2" variant="headingLg">
              All CTAs
            </Text>
            <Badge>{`${ctas.length} total`}</Badge>
          </InlineStack>
          {ctas.length === 0 ? (
            <Card>
              <Text as="p" tone="subdued">
                Create a CTA above to start showing announcement bars.
              </Text>
            </Card>
          ) : (
            ctas.map((cta) => (
              <Card key={cta.id}>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <BlockStack gap="100">
                      <Text as="h3" variant="headingMd">
                        {cta.name}
                      </Text>
                      <InlineStack gap="200">
                        <Badge tone={cta.isEnabled ? "success" : undefined}>
                          {cta.isEnabled ? "Active" : "Paused"}
                        </Badge>
                        <Badge>{`Priority ${cta.priority}`}</Badge>
                      </InlineStack>
                    </BlockStack>
                    <Form method="post">
                      <input name="_intent" type="hidden" value="delete" />
                      <input name="id" type="hidden" value={cta.id} />
                      <Button submit tone="critical" variant="plain">
                        Delete
                      </Button>
                    </Form>
                  </InlineStack>
                  <CtaEditor cta={cta} isSaving={isSaving} />
                </BlockStack>
              </Card>
            ))
          )}
        </BlockStack>
      </BlockStack>
    </Page>
  );
}

function CtaEditor({ cta, isSaving }: { cta: CtaForm; isSaving: boolean }) {
  const [form, setForm] = useState(cta);
  const handleChange = (field: keyof CtaForm) => (value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Form method="post">
      <input name="_intent" type="hidden" value="save" />
      {cta.id && <input name="id" type="hidden" value={cta.id} />}
      <input name="isEnabled" type="hidden" value={form.isEnabled ? "on" : "off"} />
      <FormLayout>
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <TextField
            autoComplete="off"
            label="Internal name"
            name="name"
            onChange={handleChange("name")}
            value={form.name}
          />
          <TextField
            autoComplete="off"
            label="Priority"
            name="priority"
            type="number"
            onChange={handleChange("priority")}
            value={form.priority}
          />
        </InlineGrid>
        <TextField
          autoComplete="off"
          label="Announcement text"
          name="text"
          onChange={handleChange("text")}
          value={form.text}
        />
        <Select
          label="Countdown mode"
          name="isEvergreen"
          onChange={(value) => handleChange("isEvergreen")(value === "true")}
          options={[
            { label: "Fixed target date", value: "false" },
            { label: "Evergreen per visitor", value: "true" },
          ]}
          value={form.isEvergreen ? "true" : "false"}
        />
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <TextField
            autoComplete="off"
            label="Target date"
            name="targetDate"
            type="datetime-local"
            onChange={handleChange("targetDate")}
            value={form.targetDate}
          />
          <TextField
            autoComplete="off"
            label="Evergreen duration"
            min={1}
            name="minutesDuration"
            suffix="minutes"
            type="number"
            onChange={handleChange("minutesDuration")}
            value={form.minutesDuration}
          />
        </InlineGrid>
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <TextField
            autoComplete="off"
            label="Button text"
            name="buttonText"
            onChange={handleChange("buttonText")}
            value={form.buttonText}
          />
          <TextField
            autoComplete="off"
            label="Button URL"
            name="buttonUrl"
            onChange={handleChange("buttonUrl")}
            placeholder="/collections/sale"
            value={form.buttonUrl}
          />
        </InlineGrid>
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <TextField
            autoComplete="off"
            label="Background color"
            name="backgroundColor"
            onChange={handleChange("backgroundColor")}
            value={form.backgroundColor}
          />
          <TextField
            autoComplete="off"
            label="Text color"
            name="textColor"
            onChange={handleChange("textColor")}
            value={form.textColor}
          />
        </InlineGrid>
        <Preview cta={form} />
        <Checkbox
          checked={form.isEnabled}
          label="Enable on storefront"
          onChange={handleChange("isEnabled")}
        />
        <InlineStack align="end">
          <Button loading={isSaving} submit variant="primary">
            {cta.id ? "Save CTA" : "Create CTA"}
          </Button>
        </InlineStack>
      </FormLayout>
    </Form>
  );
}

function Preview({ cta }: { cta: CtaForm }) {
  return (
    <div
      style={{
        alignItems: "center",
        background: cta.backgroundColor,
        borderRadius: 8,
        color: cta.textColor,
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "center",
        minHeight: 56,
        padding: "12px 16px",
      }}
    >
      <strong>{cta.text}</strong>
      <span style={{ border: `1px solid ${cta.textColor}`, borderRadius: 6, padding: "5px 9px" }}>
        {cta.isEvergreen ? `${cta.minutesDuration}:00` : "00:12:45:09"}
      </span>
      <span
        style={{
          background: cta.textColor,
          borderRadius: 6,
          color: cta.backgroundColor,
          padding: "7px 12px",
        }}
      >
        {cta.buttonText}
      </span>
    </div>
  );
}

function parseCtaForm(formData: FormData) {
  const targetDate = new Date(stringValue(formData, "targetDate", ""));
  const minutesDuration = Number(stringValue(formData, "minutesDuration", "15"));
  const priority = Number(stringValue(formData, "priority", "0"));

  if (Number.isNaN(targetDate.getTime())) {
    return { ok: false as const, error: "Choose a valid target date." };
  }

  if (!Number.isInteger(minutesDuration) || minutesDuration < 1) {
    return { ok: false as const, error: "Evergreen duration must be at least 1 minute." };
  }

  if (!Number.isInteger(priority)) {
    return { ok: false as const, error: "Priority must be a whole number." };
  }

  return {
    ok: true as const,
    value: {
      name: stringValue(formData, "name", "Announcement").trim() || "Announcement",
      text: stringValue(formData, "text", "Flash Sale!").trim() || "Flash Sale!",
      targetDate,
      isEvergreen: stringValue(formData, "isEvergreen", "false") === "true",
      minutesDuration,
      backgroundColor: normalizeHex(stringValue(formData, "backgroundColor", "#000000")),
      textColor: normalizeHex(stringValue(formData, "textColor", "#ffffff")),
      buttonText: stringValue(formData, "buttonText", "Shop now").trim(),
      buttonUrl: stringValue(formData, "buttonUrl", "").trim(),
      priority,
      isEnabled: formData.get("isEnabled") === "on",
    },
  };
}

function defaultTargetDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function stringValue(formData: FormData, key: string, fallback: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : fallback;
}

function normalizeHex(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

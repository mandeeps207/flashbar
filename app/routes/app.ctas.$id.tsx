import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useLocation,
  useNavigation,
  useParams,
} from "react-router";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

type CtaForm = {
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

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  if (params.id === "new") {
    return { cta: blankCta, isNew: true };
  }

  const cta = await prisma.announcementCta.findFirst({
    where: { id: params.id, shop: session.shop },
  });

  if (!cta) {
    throw new Response("CTA not found", { status: 404 });
  }

  return {
    isNew: false,
    cta: {
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
    },
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const parsed = parseCtaForm(formData);

  if (!parsed.ok) {
    return parsed;
  }

  if (params.id === "new") {
    await prisma.announcementCta.create({
      data: {
        shop: session.shop,
        ...parsed.value,
      },
    });
  } else {
    await prisma.announcementCta.updateMany({
      where: { id: params.id, shop: session.shop },
      data: parsed.value,
    });
  }

  throw redirect(`/app/ctas${new URL(request.url).search}`);
};

export default function CtaDetails() {
  const { cta, isNew } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const location = useLocation();
  const navigation = useNavigation();
  const params = useParams();
  const [form, setForm] = useState(cta);
  const isSaving = navigation.state === "submitting";
  const search = location.search;

  useEffect(() => setForm(cta), [cta]);

  const handleChange = (field: keyof CtaForm) => (value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Page
      title={isNew ? "Create CTA" : "Edit CTA"}
      subtitle={isNew ? "Add a new announcement bar." : `Editing ${params.id}`}
      backAction={{ content: "CTA library", url: `/app/ctas${search}` }}
    >
      <Form method="post">
        <input name="isEnabled" type="hidden" value={form.isEnabled ? "on" : "off"} />
        <BlockStack gap="500">
          {actionData && !actionData.ok && (
            <Banner tone="critical">{actionData.error}</Banner>
          )}
          <Layout>
            <Layout.Section>
              <Card>
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
                      onChange={handleChange("priority")}
                      type="number"
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
                    onChange={(value) =>
                      handleChange("isEvergreen")(value === "true")
                    }
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
                      onChange={handleChange("targetDate")}
                      type="datetime-local"
                      value={form.targetDate}
                    />
                    <TextField
                      autoComplete="off"
                      label="Evergreen duration"
                      min={1}
                      name="minutesDuration"
                      onChange={handleChange("minutesDuration")}
                      suffix="minutes"
                      type="number"
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
                  <Checkbox
                    checked={form.isEnabled}
                    label="Enable on storefront"
                    onChange={handleChange("isEnabled")}
                  />
                </FormLayout>
              </Card>
            </Layout.Section>
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Preview
                  </Text>
                  <Preview cta={form} />
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
          <InlineStack align="end" gap="300">
            <Button url={`/app/ctas${search}`}>Cancel</Button>
            <Button loading={isSaving} submit variant="primary">
              {isNew ? "Create CTA" : "Save CTA"}
            </Button>
          </InlineStack>
        </BlockStack>
      </Form>
    </Page>
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
        minHeight: 64,
        padding: "12px 16px",
        textAlign: "center",
      }}
    >
      <strong>{cta.text}</strong>
      <span
        style={{
          border: `1px solid ${cta.textColor}`,
          borderRadius: 6,
          fontVariantNumeric: "tabular-nums",
          padding: "5px 9px",
        }}
      >
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
    return {
      ok: false as const,
      error: "Evergreen duration must be at least 1 minute.",
    };
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
      backgroundColor: normalizeHex(
        stringValue(formData, "backgroundColor", "#000000"),
      ),
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

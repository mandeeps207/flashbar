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
  headingHtml: string;
  targetDate: string;
  isEvergreen: boolean;
  minutesDuration: string;
  displayType: string;
  placement: string;
  isSticky: boolean;
  stickyPosition: string;
  backgroundColor: string;
  textColor: string;
  timerBackground: string;
  timerTextColor: string;
  digitColor: string;
  labelColor: string;
  buttonBackground: string;
  buttonTextColor: string;
  buttonText: string;
  buttonUrl: string;
  borderRadius: string;
  priority: string;
  isEnabled: boolean;
};

const blankCta: CtaForm = {
  name: "Weekend sale timer",
  text: "Flash Sale!",
  headingHtml: "Flash Sale!",
  targetDate: toDateTimeLocal(defaultTargetDate()),
  isEvergreen: false,
  minutesDuration: "15",
  displayType: "inline",
  placement: "theme_block",
  isSticky: false,
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
  borderRadius: "6",
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
      headingHtml: cta.headingHtml,
      targetDate: toDateTimeLocal(cta.targetDate),
      isEvergreen: cta.isEvergreen,
      minutesDuration: String(cta.minutesDuration),
      displayType: cta.displayType,
      placement: cta.placement,
      isSticky: cta.isSticky,
      stickyPosition: cta.stickyPosition,
      backgroundColor: cta.backgroundColor,
      textColor: cta.textColor,
      timerBackground: cta.timerBackground,
      timerTextColor: cta.timerTextColor,
      digitColor: cta.digitColor,
      labelColor: cta.labelColor,
      buttonBackground: cta.buttonBackground,
      buttonTextColor: cta.buttonTextColor,
      buttonText: cta.buttonText,
      buttonUrl: cta.buttonUrl,
      borderRadius: String(cta.borderRadius),
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

  throw redirect("/app/ctas");
};

export default function CtaDetails() {
  const { cta, isNew } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const params = useParams();
  const [form, setForm] = useState(cta);
  const isSaving = navigation.state === "submitting";
  const backToCampaigns = () => window.location.assign("/app/ctas");

  useEffect(() => setForm(cta), [cta]);

  const handleChange = (field: keyof CtaForm) => (value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Page
      fullWidth
      title={isNew ? "Create timer campaign" : "Edit timer campaign"}
      subtitle={isNew ? "Build a countdown timer campaign." : `Editing ${params.id}`}
      backAction={{ content: "Timer campaigns", onAction: backToCampaigns }}
    >
      <Form method="post">
        <input name="isEnabled" type="hidden" value={form.isEnabled ? "on" : "off"} />
        <input name="isSticky" type="hidden" value={form.isSticky ? "on" : "off"} />
        <BlockStack gap="500">
          {actionData && !actionData.ok && (
            <Banner tone="critical">{actionData.error}</Banner>
          )}
          <Layout>
            <Layout.Section>
              <Card>
                <FormLayout>
                  <Text as="h2" variant="headingMd">
                    Campaign setup
                  </Text>
                  <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                    <TextField
                      autoComplete="off"
                      label="Campaign name"
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
                    label="Plain fallback text"
                    name="text"
                    onChange={handleChange("text")}
                    value={form.text}
                  />
                  <TextField
                    autoComplete="off"
                    helpText="Supports simple HTML such as strong, em, br, and span. It is sanitized before saving."
                    label="Heading HTML"
                    multiline={3}
                    name="headingHtml"
                    onChange={handleChange("headingHtml")}
                    value={form.headingHtml}
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
                    <Select
                      label="Display type"
                      name="displayType"
                      onChange={handleChange("displayType")}
                      options={[
                        { label: "Inline", value: "inline" },
                        { label: "Stacked block", value: "block" },
                      ]}
                      value={form.displayType}
                    />
                    <Select
                      label="Placement"
                      name="placement"
                      onChange={handleChange("placement")}
                      options={[
                        { label: "Theme block placement", value: "theme_block" },
                        { label: "Product page timer", value: "product_page" },
                        { label: "Full page announcement", value: "full_page" },
                      ]}
                      value={form.placement}
                    />
                  </InlineGrid>
                  <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                    <Checkbox
                      checked={form.isSticky}
                      label="Make timer sticky"
                      onChange={handleChange("isSticky")}
                    />
                    <Select
                      label="Sticky position"
                      name="stickyPosition"
                      onChange={handleChange("stickyPosition")}
                      options={[
                        { label: "Top", value: "top" },
                        { label: "Bottom", value: "bottom" },
                      ]}
                      value={form.stickyPosition}
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
              <StylingCard form={form} onChange={handleChange} />
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
            <Button onClick={backToCampaigns}>Cancel</Button>
            <Button loading={isSaving} submit variant="primary">
              Save campaign
            </Button>
          </InlineStack>
        </BlockStack>
      </Form>
    </Page>
  );
}

function StylingCard({
  form,
  onChange,
}: {
  form: CtaForm;
  onChange: (field: keyof CtaForm) => (value: string | boolean) => void;
}) {
  const sections = [
    "Timer block",
    "Heading",
    "Digits",
    "Labels",
    "CTA button",
  ];

  return (
    <Card>
      <InlineGrid columns={{ xs: 1, md: "180px 1fr" }} gap="500">
        <BlockStack gap="200">
          {sections.map((section) => (
            <Button key={section} fullWidth textAlign="left" variant="tertiary">
              {section}
            </Button>
          ))}
        </BlockStack>
        <FormLayout>
          <Text as="h2" variant="headingMd">
            Styling
          </Text>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            <TextField
              autoComplete="off"
              label="Timer block background"
              name="timerBackground"
              onChange={onChange("timerBackground")}
              value={form.timerBackground}
            />
            <TextField
              autoComplete="off"
              label="Timer block text"
              name="timerTextColor"
              onChange={onChange("timerTextColor")}
              value={form.timerTextColor}
            />
          </InlineGrid>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            <TextField
              autoComplete="off"
              label="Heading color"
              name="textColor"
              onChange={onChange("textColor")}
              value={form.textColor}
            />
            <TextField
              autoComplete="off"
              label="Campaign background"
              name="backgroundColor"
              onChange={onChange("backgroundColor")}
              value={form.backgroundColor}
            />
          </InlineGrid>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            <TextField
              autoComplete="off"
              label="Digit color"
              name="digitColor"
              onChange={onChange("digitColor")}
              value={form.digitColor}
            />
            <TextField
              autoComplete="off"
              label="Label color"
              name="labelColor"
              onChange={onChange("labelColor")}
              value={form.labelColor}
            />
          </InlineGrid>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            <TextField
              autoComplete="off"
              label="Button background"
              name="buttonBackground"
              onChange={onChange("buttonBackground")}
              value={form.buttonBackground}
            />
            <TextField
              autoComplete="off"
              label="Button text"
              name="buttonTextColor"
              onChange={onChange("buttonTextColor")}
              value={form.buttonTextColor}
            />
          </InlineGrid>
          <TextField
            autoComplete="off"
            label="Corner radius"
            min={0}
            name="borderRadius"
            onChange={onChange("borderRadius")}
            suffix="px"
            type="number"
            value={form.borderRadius}
          />
        </FormLayout>
      </InlineGrid>
    </Card>
  );
}

function Preview({ cta }: { cta: CtaForm }) {
  return (
    <div
      style={{
        alignItems: "center",
        background: cta.backgroundColor,
        borderRadius: Number(cta.borderRadius || 0),
        color: cta.textColor,
        display: "flex",
        flexDirection: cta.displayType === "block" ? "column" : "row",
        flexWrap: cta.displayType === "block" ? "nowrap" : "wrap",
        gap: 12,
        justifyContent: "center",
        minHeight: 64,
        padding: "12px 16px",
        textAlign: "center",
      }}
    >
      <strong>{cta.headingHtml.replace(/<[^>]*>/g, "") || cta.text}</strong>
      <span
        style={{
          background: cta.timerBackground,
          border: `1px solid ${cta.timerTextColor}`,
          borderRadius: 6,
          color: cta.digitColor,
          fontVariantNumeric: "tabular-nums",
          padding: "5px 9px",
        }}
      >
        {cta.isEvergreen ? `${cta.minutesDuration}:00` : "00:12:45:09"}
      </span>
      <span
        style={{
          background: cta.buttonBackground,
          borderRadius: 6,
          color: cta.buttonTextColor,
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
  const borderRadius = Number(stringValue(formData, "borderRadius", "6"));

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

  if (!Number.isInteger(borderRadius) || borderRadius < 0 || borderRadius > 48) {
    return { ok: false as const, error: "Corner radius must be between 0 and 48." };
  }

  return {
    ok: true as const,
    value: {
      name: stringValue(formData, "name", "Timer campaign").trim() || "Timer campaign",
      text: stringValue(formData, "text", "Flash Sale!").trim() || "Flash Sale!",
      headingHtml: sanitizeHeadingHtml(
        stringValue(formData, "headingHtml", "Flash Sale!"),
      ),
      targetDate,
      isEvergreen: stringValue(formData, "isEvergreen", "false") === "true",
      minutesDuration,
      displayType: enumValue(formData, "displayType", ["inline", "block"], "inline"),
      placement: enumValue(
        formData,
        "placement",
        ["theme_block", "product_page", "full_page"],
        "theme_block",
      ),
      isSticky: formData.get("isSticky") === "on",
      stickyPosition: enumValue(
        formData,
        "stickyPosition",
        ["top", "bottom"],
        "top",
      ),
      backgroundColor: normalizeHex(
        stringValue(formData, "backgroundColor", "#000000"),
      ),
      textColor: normalizeHex(stringValue(formData, "textColor", "#ffffff")),
      timerBackground: normalizeHex(
        stringValue(formData, "timerBackground", "#111111"),
      ),
      timerTextColor: normalizeHex(
        stringValue(formData, "timerTextColor", "#ffffff"),
      ),
      digitColor: normalizeHex(stringValue(formData, "digitColor", "#ffffff")),
      labelColor: normalizeHex(stringValue(formData, "labelColor", "#d1d5db")),
      buttonBackground: normalizeHex(
        stringValue(formData, "buttonBackground", "#ffffff"),
      ),
      buttonTextColor: normalizeHex(
        stringValue(formData, "buttonTextColor", "#000000"),
      ),
      buttonText: stringValue(formData, "buttonText", "Shop now").trim(),
      buttonUrl: stringValue(formData, "buttonUrl", "").trim(),
      borderRadius,
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

function enumValue(
  formData: FormData,
  key: string,
  allowed: string[],
  fallback: string,
) {
  const value = stringValue(formData, key, fallback);
  return allowed.includes(value) ? value : fallback;
}

function sanitizeHeadingHtml(value: string) {
  return value
    .replace(/<(?!\/?(strong|b|em|i|span|br)\b)[^>]*>/gi, "")
    .trim()
    .slice(0, 500) || "Flash Sale!";
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

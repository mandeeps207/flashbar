import { useEffect, useMemo, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  ColorPicker,
  FormLayout,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
  hsbToHex,
  hexToRgb,
  rgbToHsb,
} from "@shopify/polaris";
import type { HSBColor } from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

type BannerSettingForm = {
  text: string;
  targetDate: string;
  isEvergreen: boolean;
  minutesDuration: string;
  backgroundColor: string;
  textColor: string;
  buttonText: string;
  buttonUrl: string;
  isEnabled: boolean;
};

const fallbackSetting: BannerSettingForm = {
  text: "Flash Sale!",
  targetDate: toDateTimeLocal(defaultTargetDate()),
  isEvergreen: false,
  minutesDuration: "15",
  backgroundColor: "#000000",
  textColor: "#ffffff",
  buttonText: "Shop now",
  buttonUrl: "",
  isEnabled: true,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const setting = await prisma.bannerSetting.findUnique({
    where: { shop: session.shop },
  });

  return {
    setting: setting
      ? {
          text: setting.text,
          targetDate: toDateTimeLocal(setting.targetDate),
          isEvergreen: setting.isEvergreen,
          minutesDuration: String(setting.minutesDuration),
          backgroundColor: setting.backgroundColor,
          textColor: setting.textColor,
          buttonText: setting.buttonText,
          buttonUrl: setting.buttonUrl,
          isEnabled: setting.isEnabled,
        }
      : fallbackSetting,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const text = stringValue(formData, "text", fallbackSetting.text);
  const targetDateValue = stringValue(
    formData,
    "targetDate",
    fallbackSetting.targetDate,
  );
  const targetDate = new Date(targetDateValue);

  if (Number.isNaN(targetDate.getTime())) {
    return { ok: false, error: "Choose a valid countdown date." };
  }

  const minutesDuration = Number(
    stringValue(formData, "minutesDuration", fallbackSetting.minutesDuration),
  );

  if (!Number.isInteger(minutesDuration) || minutesDuration < 1) {
    return { ok: false, error: "Evergreen duration must be at least 1 minute." };
  }

  await prisma.bannerSetting.upsert({
    where: { shop: session.shop },
    create: {
      shop: session.shop,
      text,
      targetDate,
      isEvergreen: formData.get("isEvergreen") === "on",
      minutesDuration,
      backgroundColor: normalizeHex(
        stringValue(formData, "backgroundColor", fallbackSetting.backgroundColor),
      ),
      textColor: normalizeHex(
        stringValue(formData, "textColor", fallbackSetting.textColor),
      ),
      buttonText: stringValue(formData, "buttonText", fallbackSetting.buttonText),
      buttonUrl: stringValue(formData, "buttonUrl", fallbackSetting.buttonUrl),
      isEnabled: formData.get("isEnabled") === "on",
    },
    update: {
      text,
      targetDate,
      isEvergreen: formData.get("isEvergreen") === "on",
      minutesDuration,
      backgroundColor: normalizeHex(
        stringValue(formData, "backgroundColor", fallbackSetting.backgroundColor),
      ),
      textColor: normalizeHex(
        stringValue(formData, "textColor", fallbackSetting.textColor),
      ),
      buttonText: stringValue(formData, "buttonText", fallbackSetting.buttonText),
      buttonUrl: stringValue(formData, "buttonUrl", fallbackSetting.buttonUrl),
      isEnabled: formData.get("isEnabled") === "on",
    },
  });

  return { ok: true };
};

export default function Index() {
  const { setting } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [form, setForm] = useState<BannerSettingForm>(setting);
  const [backgroundPicker, setBackgroundPicker] = useState<HSBColor>(() =>
    hexToHsb(setting.backgroundColor),
  );
  const [textPicker, setTextPicker] = useState<HSBColor>(() =>
    hexToHsb(setting.textColor),
  );
  const isSaving = navigation.state === "submitting";

  useEffect(() => {
    setForm(setting);
    setBackgroundPicker(hexToHsb(setting.backgroundColor));
    setTextPicker(hexToHsb(setting.textColor));
  }, [setting]);

  const previewCountdown = useMemo(() => {
    if (form.isEvergreen) {
      return `${form.minutesDuration || 15}:00`;
    }

    const diff = new Date(form.targetDate).getTime() - Date.now();
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }, [form.isEvergreen, form.minutesDuration, form.targetDate]);

  const handleFieldChange =
    (field: keyof BannerSettingForm) => (value: string | boolean) => {
      setForm((current) => ({ ...current, [field]: value }));
    };

  const updateBackground = (color: HSBColor) => {
    const hex = hsbToHex(color);
    setBackgroundPicker(color);
    setForm((current) => ({ ...current, backgroundColor: hex }));
  };

  const updateTextColor = (color: HSBColor) => {
    const hex = hsbToHex(color);
    setTextPicker(color);
    setForm((current) => ({ ...current, textColor: hex }));
  };

  return (
    <Page
      title="FlashBar"
      subtitle="Configure the announcement timer shown by your theme app block."
    >
      <Form method="post">
        <input name="backgroundColor" type="hidden" value={form.backgroundColor} />
        <input name="textColor" type="hidden" value={form.textColor} />
        <BlockStack gap="500">
          {actionData?.ok && (
            <Banner tone="success">Banner settings saved.</Banner>
          )}
          {actionData && !actionData.ok && (
            <Banner tone="critical">{actionData.error}</Banner>
          )}

          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Live preview
              </Text>
              <Box
                borderRadius="200"
                padding="400"
                background="bg-fill"
                overflowX="hidden"
              >
                <div
                  style={{
                    alignItems: "center",
                    background: form.backgroundColor,
                    color: form.textColor,
                    display: "flex",
                    gap: "16px",
                    justifyContent: "center",
                    minHeight: 64,
                    opacity: form.isEnabled ? 1 : 0.45,
                    padding: "12px 16px",
                    textAlign: "center",
                  }}
                >
                  <strong>{form.text || "Flash Sale!"}</strong>
                  <span
                    style={{
                      border: `1px solid ${form.textColor}`,
                      borderRadius: 6,
                      fontVariantNumeric: "tabular-nums",
                      padding: "6px 10px",
                    }}
                  >
                    {previewCountdown}
                  </span>
                  {form.buttonText && (
                    <span
                      style={{
                        background: form.textColor,
                        borderRadius: 6,
                        color: form.backgroundColor,
                        padding: "8px 12px",
                      }}
                    >
                      {form.buttonText}
                    </span>
                  )}
                </div>
              </Box>
            </BlockStack>
          </Card>

          <Layout>
            <Layout.Section>
              <Card>
                <FormLayout>
                  <TextField
                    autoComplete="off"
                    label="Banner text"
                    name="text"
                    onChange={handleFieldChange("text")}
                    value={form.text}
                  />
                  <Select
                    label="Countdown mode"
                    name="countdownMode"
                    onChange={(value) =>
                      handleFieldChange("isEvergreen")(value === "evergreen")
                    }
                    options={[
                      { label: "Fixed target date", value: "fixed" },
                      { label: "Evergreen per visitor", value: "evergreen" },
                    ]}
                    value={form.isEvergreen ? "evergreen" : "fixed"}
                  />
                  <input
                    name="isEvergreen"
                    type="hidden"
                    value={form.isEvergreen ? "on" : "off"}
                  />
                  <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                    <TextField
                      autoComplete="off"
                      disabled={form.isEvergreen}
                      label="Target date"
                      name="targetDate"
                      onChange={handleFieldChange("targetDate")}
                      type="datetime-local"
                      value={form.targetDate}
                    />
                    <TextField
                      autoComplete="off"
                      disabled={!form.isEvergreen}
                      label="Evergreen duration"
                      min={1}
                      name="minutesDuration"
                      onChange={handleFieldChange("minutesDuration")}
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
                      onChange={handleFieldChange("buttonText")}
                      value={form.buttonText}
                    />
                    <TextField
                      autoComplete="off"
                      label="Button URL"
                      name="buttonUrl"
                      onChange={handleFieldChange("buttonUrl")}
                      placeholder="/collections/sale"
                      value={form.buttonUrl}
                    />
                  </InlineGrid>
                  <Checkbox
                    checked={form.isEnabled}
                    label="Enable storefront banner"
                    name="isEnabled"
                    onChange={handleFieldChange("isEnabled")}
                  />
                </FormLayout>
              </Card>
            </Layout.Section>
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      Colors
                    </Text>
                    <InlineStack gap="300" wrap={false}>
                      <ColorSwatch color={form.backgroundColor} />
                      <TextField
                        autoComplete="off"
                        label="Background"
                        labelHidden
                        onChange={handleFieldChange("backgroundColor")}
                        value={form.backgroundColor}
                      />
                    </InlineStack>
                    <ColorPicker
                      color={backgroundPicker}
                      onChange={updateBackground}
                    />
                  </BlockStack>
                  <BlockStack gap="200">
                    <InlineStack gap="300" wrap={false}>
                      <ColorSwatch color={form.textColor} />
                      <TextField
                        autoComplete="off"
                        label="Text color"
                        labelHidden
                        onChange={handleFieldChange("textColor")}
                        value={form.textColor}
                      />
                    </InlineStack>
                    <ColorPicker color={textPicker} onChange={updateTextColor} />
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>

          <InlineStack align="end">
            <Button loading={isSaving} submit variant="primary">
              Save Settings
            </Button>
          </InlineStack>
        </BlockStack>
      </Form>
    </Page>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        background: color,
        border: "1px solid #dcdfe4",
        borderRadius: 6,
        display: "inline-block",
        flex: "0 0 40px",
        height: 40,
        width: 40,
      }}
    />
  );
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

function hexToHsb(hex: string): HSBColor {
  const rgb = hexToRgb(normalizeHex(hex));
  return rgbToHsb({
    red: rgb?.red ?? 0,
    green: rgb?.green ?? 0,
    blue: rgb?.blue ?? 0,
  });
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

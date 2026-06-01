import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>FlashBar announcement CTAs</h1>
        <p className={styles.text}>
          Build timed announcement bars, track clicks, and learn what gets
          shoppers to act.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Multiple CTAs</strong>. Run sale, shipping, and launch bars
            from one Shopify app.
          </li>
          <li>
            <strong>Countdown urgency</strong>. Use fixed campaign deadlines or
            evergreen visitor sessions.
          </li>
          <li>
            <strong>Performance analytics</strong>. See impressions, clicks,
            CTR, devices, and sources.
          </li>
        </ul>
      </div>
    </div>
  );
}

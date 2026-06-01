import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export default function App() {
  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>FlashBar announcement CTAs</h1>
        <p className={styles.text}>
          Build timed announcement bars, track clicks, and learn what gets
          shoppers to act.
        </p>
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

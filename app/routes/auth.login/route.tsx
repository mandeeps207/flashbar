import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (!url.searchParams.get("shop")) {
    throw redirect("/");
  }

  const errors = loginErrorMessage(await login(request));

  if (errors.shop) {
    throw redirect("/");
  }

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  if (errors.shop) {
    throw redirect("/");
  }

  return null;
};

export default function Auth() {
  return null;
}

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // FlashBar stores campaign settings and aggregate interaction events only.
  // No customer records are stored, so there is no customer data to return.
  return new Response();
};

import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";

export const loader = async (_args: LoaderFunctionArgs) => {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    SCOPES: Boolean(process.env.SCOPES),
    SHOPIFY_API_KEY: Boolean(process.env.SHOPIFY_API_KEY),
    SHOPIFY_API_SECRET: Boolean(process.env.SHOPIFY_API_SECRET),
    SHOPIFY_APP_URL: Boolean(process.env.SHOPIFY_APP_URL),
  };

  let database = true;
  try {
    await prisma.session.count();
  } catch {
    database = false;
  }

  return Response.json({
    ok: database && Object.values(env).every(Boolean),
    database,
    env,
  });
};

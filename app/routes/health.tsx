import prisma from "../db.server";

export const loader = async () => {
  const startedAt = performance.now();
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    SCOPES: Boolean(process.env.SCOPES),
    SHOPIFY_API_KEY: Boolean(process.env.SHOPIFY_API_KEY),
    SHOPIFY_API_SECRET: Boolean(process.env.SHOPIFY_API_SECRET),
    SHOPIFY_APP_URL: Boolean(process.env.SHOPIFY_APP_URL),
  };

  let database = true;
  let databaseMs = 0;
  try {
    const databaseStartedAt = performance.now();
    await prisma.session.count();
    databaseMs = Math.round(performance.now() - databaseStartedAt);
  } catch {
    database = false;
  }

  return Response.json({
    ok: database && Object.values(env).every(Boolean),
    database,
    databaseMs,
    env,
    totalMs: Math.round(performance.now() - startedAt),
  });
};

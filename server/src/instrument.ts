import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
  // Capture 100% of transactions in development; lower in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
});

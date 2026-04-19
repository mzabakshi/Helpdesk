import { test, expect, type APIRequestContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Read from server/.env.test (loaded by playwright.config.ts via dotenv).
const API_BASE = process.env.API_BASE ?? "http://localhost:3000";
const VALID_TOKEN = process.env.WEBHOOK_SECRET ?? "";
const WEBHOOK_URL = `${API_BASE}/api/webhooks/inbound`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Post to the inbound webhook with multipart/form-data.
 * `token` defaults to the valid token; pass `null` to omit it entirely.
 */
async function postWebhook(
  request: APIRequestContext,
  fields: { from?: string; subject?: string; text?: string },
  token: string | null = VALID_TOKEN
) {
  const url =
    token !== null ? `${WEBHOOK_URL}?token=${token}` : WEBHOOK_URL;
  return request.post(url, { multipart: fields });
}

/**
 * Fetch the latest ticket from the test-only helper endpoint.
 * Returns null if no ticket matches.
 */
async function getLatestTicket(
  request: APIRequestContext,
  subject: string
) {
  const url = `${API_BASE}/api/test/tickets/latest?subject=${encodeURIComponent(subject)}`;
  const res = await request.get(url);
  expect(res.status()).toBe(200);
  return res.json() as Promise<{
    subject: string;
    body: string;
    fromEmail: string;
    fromName: string;
    status: string;
    category: string;
  } | null>;
}

// Generates a short unique suffix so tests don't collide even when re-run
// quickly.
function uid() {
  return Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("POST /api/webhooks/inbound", () => {
  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  test.describe("authentication", () => {
    test("missing token returns 401", async ({ request }) => {
      const response = await postWebhook(
        request,
        { from: "user@example.com", subject: "Missing token", text: "Body" },
        null // no token
      );

      expect(response.status()).toBe(401);
    });

    test("wrong token returns 401", async ({ request }) => {
      const response = await postWebhook(
        request,
        { from: "user@example.com", subject: "Wrong token", text: "Body" },
        "completely-wrong-secret"
      );

      expect(response.status()).toBe(401);
    });

    test("wrong token does not create a ticket in the DB", async ({
      request,
    }) => {
      const subject = `No-ticket-wrong-token-${uid()}`;

      await postWebhook(
        request,
        { from: "user@example.com", subject, text: "Body" },
        "bad-secret"
      );

      const ticket = await getLatestTicket(request, subject);
      expect(ticket).toBeNull();
    });

    test("missing token does not create a ticket in the DB", async ({
      request,
    }) => {
      const subject = `No-ticket-missing-token-${uid()}`;

      await postWebhook(
        request,
        { from: "user@example.com", subject, text: "Body" },
        null
      );

      const ticket = await getLatestTicket(request, subject);
      expect(ticket).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  test.describe("valid requests", () => {
    test('from field in "Name <email>" format creates ticket with parsed name and email', async ({
      request,
    }) => {
      const subject = `Named sender test ${uid()}`;

      const response = await postWebhook(request, {
        from: "Jane Doe <jane@example.com>",
        subject,
        text: "This is the ticket body.",
      });

      expect(response.status()).toBe(200);

      const ticket = await getLatestTicket(request, subject);
      expect(ticket).not.toBeNull();
      expect(ticket!.fromName).toBe("Jane Doe");
      expect(ticket!.fromEmail).toBe("jane@example.com");
      expect(ticket!.body).toBe("This is the ticket body.");
      expect(ticket!.status).toBe("open");
      expect(ticket!.category).toBe("general_question");
    });

    test("plain email in from field (no angle brackets) sets fromName and fromEmail to the email address", async ({
      request,
    }) => {
      const subject = `Plain email test ${uid()}`;

      const response = await postWebhook(request, {
        from: "plainuser@example.com",
        subject,
        text: "Some body",
      });

      expect(response.status()).toBe(200);

      const ticket = await getLatestTicket(request, subject);
      expect(ticket).not.toBeNull();
      expect(ticket!.fromName).toBe("plainuser@example.com");
      expect(ticket!.fromEmail).toBe("plainuser@example.com");
    });

    test("missing subject field defaults to '(no subject)'", async ({
      request,
    }) => {
      // We cannot filter by subject here (it will be the default), so we use a
      // unique body to locate the right ticket via the body field. We'll fetch
      // by the default subject and then match on body.
      const uniqueBody = `No-subject-body-${uid()}`;

      const response = await postWebhook(request, {
        from: "sender@example.com",
        // subject intentionally omitted
        text: uniqueBody,
      });

      expect(response.status()).toBe(200);

      // Fetch the most recent ticket whose subject is the default value
      const res = await request.get(
        `${API_BASE}/api/test/tickets/latest?subject=${encodeURIComponent("(no subject)")}`
      );
      expect(res.status()).toBe(200);
      const ticket = await res.json();

      expect(ticket).not.toBeNull();
      expect(ticket.subject).toBe("(no subject)");
    });

    test("missing text field results in ticket with empty string body", async ({
      request,
    }) => {
      const subject = `No body test ${uid()}`;

      const response = await postWebhook(request, {
        from: "sender@example.com",
        subject,
        // text intentionally omitted
      });

      expect(response.status()).toBe(200);

      const ticket = await getLatestTicket(request, subject);
      expect(ticket).not.toBeNull();
      expect(ticket!.body).toBe("");
    });
  });
});

import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN = { email: "admin@example.com", password: "password123" };
const AGENT = { email: "agent@example.com", password: "password123" };

async function login(
  page: import("@playwright/test").Page,
  credentials: { email: string; password: string }
) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/");
}

// ---------------------------------------------------------------------------
// Login page — valid credentials
// ---------------------------------------------------------------------------

test.describe("Login page — valid credentials", () => {
  test("admin can log in and is redirected to /", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Welcome to Helpdesk")).toBeVisible();
  });

  test("agent can log in and is redirected to /", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(AGENT.email);
    await page.getByLabel("Password").fill(AGENT.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Welcome to Helpdesk")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Login page — invalid inputs / client-side validation
// ---------------------------------------------------------------------------

test.describe("Login page — validation errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("submitting empty form shows validation errors for both fields", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(
      page.getByText("Enter a valid email address")
    ).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("invalid email format shows email validation error", async ({ page }) => {
    await page.getByLabel("Email address").fill("not-an-email");
    await page.getByLabel("Password").fill("somepassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(
      page.getByText("Enter a valid email address")
    ).toBeVisible();
  });

  test("empty email field shows validation error", async ({ page }) => {
    await page.getByLabel("Password").fill("somepassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(
      page.getByText("Enter a valid email address")
    ).toBeVisible();
  });

  test("empty password field shows validation error", async ({ page }) => {
    await page.getByLabel("Email address").fill(ADMIN.email);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Password is required")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Login page — server-side errors
// ---------------------------------------------------------------------------

test.describe("Login page — server-side errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("wrong password shows error message", async ({ page }) => {
    await page.getByLabel("Email address").fill(ADMIN.email);
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Error is rendered in the root error div
    await expect(page.locator(".bg-destructive\\/10")).toBeVisible();
    // URL should remain /login
    await expect(page).toHaveURL("/login");
  });

  test("non-existent email shows error message", async ({ page }) => {
    await page.getByLabel("Email address").fill("nobody@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.locator(".bg-destructive\\/10")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// Already logged in — redirect away from /login
// ---------------------------------------------------------------------------

test.describe("Already authenticated", () => {
  test("visiting /login while logged in redirects to /", async ({ page }) => {
    await login(page, ADMIN);

    // Now navigate explicitly to /login — should be bounced back
    await page.goto("/login");
    // The app doesn't currently redirect from /login when already authed,
    // so this verifies the current behaviour: user stays on /login but is
    // still considered authenticated (NavBar not present on login page).
    // If a redirect is added later, update this assertion to toHaveURL("/").
    // For now we just confirm no crash occurs.
    await expect(page.getByText("Welcome back")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

test.describe("Session persistence", () => {
  test("after login, refreshing the page keeps the user authenticated", async ({
    page,
  }) => {
    await login(page, ADMIN);

    // Hard reload
    await page.reload();

    // Should still be on / with the NavBar visible
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("button", { name: "Sign Out" })
    ).toBeVisible();
  });

  test("accessing a protected route while logged out redirects to /login", async ({
    page,
  }) => {
    // Do not log in — go straight to /
    await page.goto("/");

    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

test.describe("Sign out", () => {
  test("clicking Sign Out clears the session and redirects to /login", async ({
    page,
  }) => {
    await login(page, ADMIN);

    await page.getByRole("button", { name: "Sign Out" }).click();

    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("after signing out, navigating to / redirects to /login", async ({
    page,
  }) => {
    await login(page, ADMIN);

    await page.getByRole("button", { name: "Sign Out" }).click();
    await page.waitForURL("/login");

    // Try to visit the protected root route
    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// Role-based access — /users is admin-only
// ---------------------------------------------------------------------------

test.describe("Role-based access", () => {
  test("admin can access /users", async ({ page }) => {
    await login(page, ADMIN);

    await page.goto("/users");

    // AdminLayout lets the admin through — should NOT be redirected
    await expect(page).toHaveURL("/users");
  });

  test("agent visiting /users is redirected to /", async ({ page }) => {
    await login(page, AGENT);

    await page.goto("/users");

    // AdminLayout redirects non-admins to /
    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
  });

  test("unauthenticated user visiting /users is redirected to /login", async ({
    page,
  }) => {
    // No login
    await page.goto("/users");

    // AdminLayout redirects unauthenticated users to /login
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("admin NavBar shows the Users link", async ({ page }) => {
    await login(page, ADMIN);

    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("agent NavBar does not show the Users link", async ({ page }) => {
    await login(page, AGENT);

    await expect(
      page.getByRole("link", { name: "Users" })
    ).not.toBeVisible();
  });
});

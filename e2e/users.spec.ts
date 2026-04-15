import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Credentials — match the values seeded in server/src/reset-test-db.ts
// ---------------------------------------------------------------------------

const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
  password: process.env.SEED_ADMIN_PASSWORD ?? "password123",
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/");
}

// Unique suffix so parallel-resistant even with workers: 1
function uid() {
  return Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

test.describe("User management — list", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/users");
    await expect(page).toHaveURL("/users");
  });

  test("admin sees the users table with at least the admin row", async ({
    page,
  }) => {
    // Wait for the table to render (skeletons gone)
    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    // The seeded admin row must be present
    await expect(page.getByRole("cell", { name: ADMIN.email })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

test.describe("User management — create", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/users");
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("admin can create a new agent user and the user appears in the table", async ({
    page,
  }) => {
    const id = uid();
    const newName = `Test Agent ${id}`;
    const newEmail = `agent-${id}@example.com`;
    const newPassword = "SecurePass123!";

    // Open the dialog
    await page.getByRole("button", { name: "Add User" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add User" })
    ).toBeVisible();

    // Fill in the form
    await page.getByLabel("Name").fill(newName);
    await page.getByLabel("Email").fill(newEmail);
    await page.getByLabel("Password").fill(newPassword);

    // Submit
    await page.getByRole("button", { name: "Create" }).click();

    // Dialog should close and the new row should appear
    await expect(
      page.getByRole("dialog", { name: "Add User" })
    ).not.toBeVisible();
    await expect(page.getByRole("cell", { name: newName, exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: newEmail, exact: true })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

test.describe("User management — edit", () => {
  let createdName: string;
  let createdEmail: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/users");
    await expect(page.getByRole("table")).toBeVisible();

    // Create a fresh agent to edit so the test is self-contained
    const id = uid();
    createdName = `Edit Target ${id}`;
    createdEmail = `edit-${id}@example.com`;

    await page.getByRole("button", { name: "Add User" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add User" })
    ).toBeVisible();
    await page.getByLabel("Name").fill(createdName);
    await page.getByLabel("Email").fill(createdEmail);
    await page.getByLabel("Password").fill("SecurePass123!");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add User" })
    ).not.toBeVisible();
    await expect(page.getByRole("cell", { name: createdName, exact: true })).toBeVisible();
  });

  test("admin can edit a user name and the updated name appears in the table", async ({
    page,
  }) => {
    const updatedName = `${createdName} (edited)`;

    // Click the Edit (pencil) button for this specific user row
    await page
      .getByRole("button", { name: `Edit ${createdName}` })
      .click();

    const editDialog = page.getByRole("dialog", { name: "Edit User" });
    await expect(editDialog).toBeVisible();

    // Clear the name field and type the new name
    const nameInput = editDialog.getByLabel("Name");
    await nameInput.clear();
    await nameInput.fill(updatedName);

    // Save
    await editDialog.getByRole("button", { name: "Save" }).click();

    // Dialog closes; updated name visible in table
    await expect(editDialog).not.toBeVisible();
    await expect(
      page.getByRole("cell", { name: updatedName, exact: true })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

test.describe("User management — delete", () => {
  let agentName: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/users");
    await expect(page.getByRole("table")).toBeVisible();

    // Create a disposable agent to delete
    const id = uid();
    agentName = `Delete Target ${id}`;

    await page.getByRole("button", { name: "Add User" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add User" })
    ).toBeVisible();
    await page.getByLabel("Name").fill(agentName);
    await page.getByLabel("Email").fill(`delete-${id}@example.com`);
    await page.getByLabel("Password").fill("SecurePass123!");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(
      page.getByRole("dialog", { name: "Add User" })
    ).not.toBeVisible();
    await expect(page.getByRole("cell", { name: agentName, exact: true })).toBeVisible();
  });

  test("admin can delete an agent user and the user disappears from the table", async ({
    page,
  }) => {
    // Click the Delete (trash) button for the agent row
    await page
      .getByRole("button", { name: `Delete ${agentName}` })
      .click();

    // AlertDialog should appear
    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog).toBeVisible();
    await expect(alertDialog.getByText("Delete User")).toBeVisible();

    // Confirm deletion
    await alertDialog.getByRole("button", { name: "Delete" }).click();

    // AlertDialog closes; the deleted row is gone
    await expect(alertDialog).not.toBeVisible();
    await expect(
      page.getByRole("cell", { name: agentName, exact: true })
    ).not.toBeVisible();
  });
});

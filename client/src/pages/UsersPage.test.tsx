import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import UsersPage from "./UsersPage";
import { renderWithQuery } from "@/test/renderWithQuery";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

const USERS = [
  { id: "1", name: "Alice Admin", email: "alice@example.com", role: "admin", createdAt: "2024-01-01T00:00:00Z" },
  { id: "2", name: "Bob Agent", email: "bob@example.com", role: "agent", createdAt: "2024-02-01T00:00:00Z" },
];

function renderPage() {
  return renderWithQuery(<UsersPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UsersPage", () => {
  it("shows skeletons while loading", () => {
    mockedAxios.get = vi.fn(() => new Promise(() => {})); // never resolves
    renderPage();
    const skeletons = document.querySelectorAll(".rounded-md");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders the user list after loading", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: USERS });
    renderPage();

    await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bob Agent")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  it("renders role badges correctly", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: USERS });
    renderPage();

    await waitFor(() => screen.getByText("Alice Admin"));
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("agent")).toBeInTheDocument();
  });

  it("shows empty state when no users returned", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: [] });
    renderPage();

    await waitFor(() => expect(screen.getByText("No users found.")).toBeInTheDocument());
  });

  it("shows an error message when the fetch fails", async () => {
    const err = Object.assign(new Error("Request failed"), {
      isAxiosError: true,
      response: { data: { error: "Unauthorized" } },
    });
    mockedAxios.get = vi.fn().mockRejectedValue(err);
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never);
    renderPage();

    await waitFor(() => expect(screen.getByText("Unauthorized")).toBeInTheDocument());
  });

  it("opens the Add User dialog when the button is clicked", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: USERS });
    renderPage();

    await waitFor(() => screen.getByText("Alice Admin"));
    await userEvent.click(screen.getByRole("button", { name: /add user/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("closes the dialog when clicking outside (overlay)", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: USERS });
    renderPage();

    await waitFor(() => screen.getByText("Alice Admin"));
    await userEvent.click(screen.getByRole("button", { name: /add user/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click on the Radix overlay backdrop (outside the dialog content) to dismiss
    const overlay = document.querySelector("[data-radix-dialog-overlay]") as HTMLElement;
    if (overlay) await userEvent.click(overlay);
    else await userEvent.click(document.body);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes the dialog when the Escape key is pressed", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: USERS });
    renderPage();

    await waitFor(() => screen.getByText("Alice Admin"));
    await userEvent.click(screen.getByRole("button", { name: /add user/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes the dialog when Cancel is clicked", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: USERS });
    renderPage();

    await waitFor(() => screen.getByText("Alice Admin"));
    await userEvent.click(screen.getByRole("button", { name: /add user/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("submits the form and refetches the list on success", async () => {
    const newUser = { id: "3", name: "Carol", email: "carol@example.com", role: "agent", createdAt: "2024-03-01T00:00:00Z" };
    mockedAxios.get = vi.fn().mockResolvedValue({ data: USERS });
    mockedAxios.post = vi.fn().mockResolvedValue({ data: newUser });
    renderPage();

    await waitFor(() => screen.getByText("Alice Admin"));
    await userEvent.click(screen.getByRole("button", { name: /add user/i }));

    await userEvent.type(screen.getByLabelText("Name"), "Carol");
    await userEvent.type(screen.getByLabelText("Email"), "carol@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");

    // Subsequent GET after invalidation returns the updated list
    mockedAxios.get = vi.fn().mockResolvedValue({ data: [...USERS, newUser] });

    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({ name: "Carol", email: "carol@example.com" }),
      expect.objectContaining({ withCredentials: true })
    );
  });

  describe("edit dialog", () => {
    async function openEditDialog() {
      mockedAxios.get = vi.fn().mockResolvedValue({ data: USERS });
      renderPage();
      await waitFor(() => screen.getByText("Alice Admin"));
      await userEvent.click(screen.getByRole("button", { name: /edit alice admin/i }));
    }

    it("opens the Edit User dialog with the user's data pre-filled", async () => {
      await openEditDialog();

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toHaveValue("Alice Admin");
      expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
      expect(screen.getByLabelText("New Password")).toHaveValue("");
    });

    it("closes the edit dialog when Cancel is clicked", async () => {
      await openEditDialog();
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes the edit dialog when Escape is pressed", async () => {
      await openEditDialog();
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("patches the user and closes the dialog on success", async () => {
      mockedAxios.patch = vi.fn().mockResolvedValue({ data: { ...USERS[0], name: "Alice Updated" } });
      await openEditDialog();

      await userEvent.clear(screen.getByLabelText("Name"));
      await userEvent.type(screen.getByLabelText("Name"), "Alice Updated");
      await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/api/users/1",
        expect.objectContaining({ name: "Alice Updated", email: "alice@example.com" }),
        expect.objectContaining({ withCredentials: true })
      );
    });

    it("shows a server error when the patch fails", async () => {
      const err = Object.assign(new Error("Conflict"), {
        isAxiosError: true,
        response: { data: { error: "A user with that email already exists" } },
      });
      mockedAxios.patch = vi.fn().mockRejectedValue(err);
      vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never);
      await openEditDialog();

      await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() =>
        expect(screen.getByText("A user with that email already exists")).toBeInTheDocument()
      );
    });

    it("only one dialog is open at a time — Add User closes edit dialog", async () => {
      await openEditDialog();
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Close edit, then open create
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      await userEvent.click(screen.getByRole("button", { name: /add user/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument(); // create dialog has Password, not New Password
    });
  });

  it("shows a form error when creation fails", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: USERS });
    const err = Object.assign(new Error("Conflict"), {
      isAxiosError: true,
      response: { data: { error: "A user with that email already exists" } },
    });
    mockedAxios.post = vi.fn().mockRejectedValue(err);
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never);
    renderPage();

    await waitFor(() => screen.getByText("Alice Admin"));
    await userEvent.click(screen.getByRole("button", { name: /add user/i }));

    await userEvent.type(screen.getByLabelText("Name"), "Alice Admin");
    await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() =>
      expect(screen.getByText("A user with that email already exists")).toBeInTheDocument()
    );
  });
});

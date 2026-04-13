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

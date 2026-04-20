import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { TicketStatus, TicketCategory } from "core";
import TicketDetailPage from "./TicketDetailPage";
import { renderWithQuery } from "@/test/renderWithQuery";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useParams: () => ({ id: "ticket-1" }) };
});

const AGENTS = [
  { id: "agent-1", name: "Alice" },
  { id: "agent-2", name: "Bob" },
];

const TICKET = {
  id: "ticket-1",
  subject: "Cannot login",
  body: "I have been unable to log in for two days.",
  fromName: "Jane Smith",
  fromEmail: "jane@example.com",
  status: TicketStatus.Open,
  category: TicketCategory.TechnicalIssue,
  assignedTo: null,
  createdAt: "2024-03-01T10:00:00Z",
  updatedAt: "2024-03-01T10:00:00Z",
};

function mockGet(ticket = TICKET, agents = AGENTS) {
  mockedAxios.get = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/agents")) return Promise.resolve({ data: agents });
    return Promise.resolve({ data: ticket });
  });
}

function renderPage() {
  return renderWithQuery(<TicketDetailPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TicketDetailPage", () => {
  it("shows skeletons while loading", () => {
    mockedAxios.get = vi.fn(() => new Promise(() => {}));
    renderPage();
    const skeletons = document.querySelectorAll(".rounded-md");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders ticket details after loading", async () => {
    mockGet();
    renderPage();

    await waitFor(() => expect(screen.getByText("Cannot login")).toBeInTheDocument());
    expect(screen.getByText("I have been unable to log in for two days.")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText(/jane@example\.com/)).toBeInTheDocument();
  });

  it("shows an error message when the ticket fetch fails", async () => {
    const err = Object.assign(new Error("Not found"), {
      isAxiosError: true,
      response: { data: { error: "Ticket not found" } },
    });
    mockedAxios.get = vi.fn().mockRejectedValue(err);
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never);
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Ticket not found")).toBeInTheDocument()
    );
  });

  // ── Status ────────────────────────────────────────────────────────────────

  it("shows the current status in the Status select", async () => {
    mockGet();
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Open");
  });

  it("calls PATCH with the new status when status is changed", async () => {
    mockGet();
    mockedAxios.patch = vi.fn().mockResolvedValue({ data: { ...TICKET, status: TicketStatus.Resolved } });
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
    await userEvent.click(await screen.findByRole("option", { name: "Resolved" }));

    await waitFor(() =>
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/api/tickets/ticket-1",
        { status: TicketStatus.Resolved },
        expect.any(Object)
      )
    );
  });

  it("disables the Status select while the update mutation is pending", async () => {
    mockGet();
    mockedAxios.patch = vi.fn(() => new Promise(() => {}));
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
    await userEvent.click(await screen.findByRole("option", { name: "Resolved" }));

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Status" })).toBeDisabled()
    );
  });

  it("shows an error when the status update fails", async () => {
    mockGet();
    const err = Object.assign(new Error("Server error"), {
      isAxiosError: true,
      response: { data: { error: "Failed to update status" } },
    });
    mockedAxios.patch = vi.fn().mockRejectedValue(err);
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never);
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
    await userEvent.click(await screen.findByRole("option", { name: "Resolved" }));

    await waitFor(() =>
      expect(screen.getByText("Failed to update status")).toBeInTheDocument()
    );
  });

  // ── Category ──────────────────────────────────────────────────────────────

  it("shows the current category in the Category select", async () => {
    mockGet();
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent("Technical Issue");
  });

  it("calls PATCH with the new category when category is changed", async () => {
    mockGet();
    mockedAxios.patch = vi.fn().mockResolvedValue({
      data: { ...TICKET, category: TicketCategory.RefundRequest },
    });
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));

    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));
    await userEvent.click(await screen.findByRole("option", { name: "Refund Request" }));

    await waitFor(() =>
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/api/tickets/ticket-1",
        { category: TicketCategory.RefundRequest },
        expect.any(Object)
      )
    );
  });

  it("disables the Category select while the update mutation is pending", async () => {
    mockGet();
    mockedAxios.patch = vi.fn(() => new Promise(() => {}));
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));

    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));
    await userEvent.click(await screen.findByRole("option", { name: "Refund Request" }));

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Category" })).toBeDisabled()
    );
  });

  // ── Assignment ────────────────────────────────────────────────────────────

  it("shows 'Unassigned' when no agent is assigned", async () => {
    mockGet({ ...TICKET, assignedTo: null });
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));
    expect(screen.getByRole("combobox", { name: "Assigned to" })).toHaveTextContent("Unassigned");
  });

  it("shows the assigned agent's name in the Assigned to select", async () => {
    mockGet({ ...TICKET, assignedTo: { id: "agent-1", name: "Alice" } });
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));
    expect(screen.getByRole("combobox", { name: "Assigned to" })).toHaveTextContent("Alice");
  });

  it("calls PATCH /assign with the agent id when an agent is chosen", async () => {
    mockGet();
    mockedAxios.patch = vi.fn().mockResolvedValue({
      data: { ...TICKET, assignedTo: { id: "agent-1", name: "Alice" } },
    });
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));

    await userEvent.click(screen.getByRole("combobox", { name: "Assigned to" }));
    await userEvent.click(await screen.findByRole("option", { name: "Alice" }));

    await waitFor(() =>
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/api/tickets/ticket-1/assign",
        { assignedToId: "agent-1" },
        expect.any(Object)
      )
    );
  });

  it("calls PATCH /assign with null when 'Unassigned' is selected", async () => {
    mockGet({ ...TICKET, assignedTo: { id: "agent-1", name: "Alice" } });
    mockedAxios.patch = vi.fn().mockResolvedValue({ data: { ...TICKET, assignedTo: null } });
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));

    await userEvent.click(screen.getByRole("combobox", { name: "Assigned to" }));
    await userEvent.click(await screen.findByRole("option", { name: "Unassigned" }));

    await waitFor(() =>
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        "/api/tickets/ticket-1/assign",
        { assignedToId: null },
        expect.any(Object)
      )
    );
  });

  it("disables the Assigned to select while the assign mutation is pending", async () => {
    mockGet();
    mockedAxios.patch = vi.fn(() => new Promise(() => {}));
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));

    await userEvent.click(screen.getByRole("combobox", { name: "Assigned to" }));
    await userEvent.click(await screen.findByRole("option", { name: "Alice" }));

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Assigned to" })).toBeDisabled()
    );
  });

  it("shows an inline error when the assign mutation fails", async () => {
    mockGet();
    const err = Object.assign(new Error("Bad request"), {
      isAxiosError: true,
      response: { data: { error: "Agent not found" } },
    });
    mockedAxios.patch = vi.fn().mockRejectedValue(err);
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never);
    renderPage();

    await waitFor(() => screen.getByText("Cannot login"));

    await userEvent.click(screen.getByRole("combobox", { name: "Assigned to" }));
    await userEvent.click(await screen.findByRole("option", { name: "Alice" }));

    await waitFor(() =>
      expect(screen.getByText("Agent not found")).toBeInTheDocument()
    );
  });
});

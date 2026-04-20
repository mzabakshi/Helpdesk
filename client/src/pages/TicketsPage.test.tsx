import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { TicketStatus, TicketCategory } from "core";
import TicketsPage from "./TicketsPage";
import { renderWithQuery } from "@/test/renderWithQuery";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

const TICKETS = [
  {
    id: "1",
    subject: "Cannot access my account",
    fromName: "Jane Smith",
    fromEmail: "jane@example.com",
    status: TicketStatus.Open,
    category: TicketCategory.TechnicalIssue,
    createdAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "2",
    subject: "Request a refund",
    fromName: "Bob Jones",
    fromEmail: "bob@example.com",
    status: TicketStatus.Resolved,
    category: TicketCategory.RefundRequest,
    createdAt: "2024-02-01T00:00:00Z",
  },
];

function renderPage() {
  return renderWithQuery(<TicketsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TicketsPage", () => {
  it("shows skeletons while loading", () => {
    mockedAxios.get = vi.fn(() => new Promise(() => {})); // never resolves
    renderPage();
    const skeletons = document.querySelectorAll(".rounded-md");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders the ticket list after loading", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: TICKETS });
    renderPage();

    await waitFor(() => expect(screen.getByText("Cannot access my account")).toBeInTheDocument());
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Request a refund")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("renders status and category badges correctly", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: TICKETS });
    renderPage();

    await waitFor(() => screen.getByText("Cannot access my account"));
    expect(screen.getByText(TicketStatus.Open)).toBeInTheDocument();
    expect(screen.getByText(TicketStatus.Resolved)).toBeInTheDocument();
    expect(screen.getByText("Technical Issue")).toBeInTheDocument();
    expect(screen.getByText("Refund Request")).toBeInTheDocument();
  });

  it("shows empty state when no tickets are returned", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: [] });
    renderPage();

    await waitFor(() => expect(screen.getByText("No tickets found.")).toBeInTheDocument());
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

  it("fetches with default sort params (createdAt desc)", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: TICKETS });
    renderPage();

    await waitFor(() => screen.getByText("Cannot access my account"));
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "/api/tickets",
      expect.objectContaining({ params: { sortBy: "createdAt", order: "desc" } })
    );
  });

  it("re-fetches with new sort params when a column header is clicked", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: TICKETS });
    renderPage();

    await waitFor(() => screen.getByText("Cannot access my account"));

    // Click the Subject column header to sort ascending
    await userEvent.click(screen.getByRole("button", { name: /subject/i }));

    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({ params: { sortBy: "subject", order: "asc" } })
      )
    );
  });

  it("switches sort column when a different header is clicked", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: TICKETS });
    renderPage();

    await waitFor(() => screen.getByText("Cannot access my account"));

    // Click Subject → sort by subject asc
    await userEvent.click(screen.getByRole("button", { name: /subject/i }));
    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({ params: { sortBy: "subject", order: "asc" } })
      )
    );

    // Click From → sort by fromName asc
    await userEvent.click(screen.getByRole("button", { name: /from/i }));
    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({ params: { sortBy: "fromName", order: "asc" } })
      )
    );
  });
});

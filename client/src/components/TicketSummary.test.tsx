import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import TicketSummary from "./TicketSummary";
import { renderWithQuery } from "@/test/renderWithQuery";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(axios, "isAxiosError").mockReturnValue(false as never);
});

describe("TicketSummary", () => {
  it("renders the summarize button initially", () => {
    renderWithQuery(<TicketSummary ticketId="ticket-1" />);
    expect(screen.getByRole("button", { name: /summarize/i })).toBeInTheDocument();
    expect(screen.queryByText(/ai summary/i)).not.toBeInTheDocument();
  });

  it("shows summary after clicking the button", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { summary: "This is a summary." } });

    renderWithQuery(<TicketSummary ticketId="ticket-1" />);
    fireEvent.click(screen.getByRole("button", { name: /summarize/i }));

    await waitFor(() => {
      expect(screen.getByText("This is a summary.")).toBeInTheDocument();
    });
    expect(screen.getByText(/ai summary/i)).toBeInTheDocument();
  });

  it("shows re-generate summary button after first summary", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { summary: "First summary." } });

    renderWithQuery(<TicketSummary ticketId="ticket-1" />);
    fireEvent.click(screen.getByRole("button", { name: /summarize/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /re-generate summary/i })).toBeInTheDocument();
    });
  });

  it("re-fetches summary on re-generate click", async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { summary: "First summary." } })
      .mockResolvedValueOnce({ data: { summary: "Updated summary." } });

    renderWithQuery(<TicketSummary ticketId="ticket-1" />);
    fireEvent.click(screen.getByRole("button", { name: /summarize/i }));

    await waitFor(() => screen.getByText("First summary."));

    fireEvent.click(screen.getByRole("button", { name: /re-generate summary/i }));

    await waitFor(() => {
      expect(screen.getByText("Updated summary.")).toBeInTheDocument();
    });
  });

  it("shows error message on failure", async () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never);
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { error: "Failed to summarize ticket" } },
    });

    renderWithQuery(<TicketSummary ticketId="ticket-1" />);
    fireEvent.click(screen.getByRole("button", { name: /summarize/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to summarize ticket")).toBeInTheDocument();
    });
    expect(screen.queryByText(/ai summary/i)).not.toBeInTheDocument();
  });

  it("disables button while summarizing", async () => {
    let resolve!: (v: unknown) => void;
    mockedAxios.post.mockReturnValueOnce(new Promise((r) => (resolve = r)));

    renderWithQuery(<TicketSummary ticketId="ticket-1" />);
    fireEvent.click(screen.getByRole("button", { name: /summarize/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /summarizing/i })).toBeDisabled();
    });

    resolve({ data: { summary: "Done." } });
    await waitFor(() => screen.getByText("Done."));
  });
});

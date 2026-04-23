import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import axios from "axios";
import DashboardPage from "./DashboardPage";
import { renderWithQuery } from "@/test/renderWithQuery";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

const STATS = {
  totalTickets: 120,
  openTickets: 45,
  resolvedByAI: 60,
  percentResolvedByAI: 50,
  avgResolutionTimeMs: 8100000, // 2h 15m
  ticketsPerDay: [
    { date: "2026-04-01", count: 3 },
    { date: "2026-04-02", count: 7 },
  ],
};

function renderPage() {
  return renderWithQuery(<DashboardPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardPage", () => {
  it("shows skeletons while loading", () => {
    mockedAxios.get = vi.fn(() => new Promise(() => {}));
    renderPage();
    const skeletons = document.querySelectorAll(".rounded-md");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders all stat cards after loading", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: STATS });
    renderPage();

    await waitFor(() => expect(screen.getByText("120")).toBeInTheDocument());
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();
    expect(screen.getByText("2h 15m")).toBeInTheDocument();
  });

  it("renders stat card titles", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: STATS });
    renderPage();

    await waitFor(() => expect(screen.getByText("Total Tickets")).toBeInTheDocument());
    expect(screen.getByText("Open Tickets")).toBeInTheDocument();
    expect(screen.getByText("Resolved by AI")).toBeInTheDocument();
    expect(screen.getByText("AI Resolution Rate")).toBeInTheDocument();
    expect(screen.getByText("Avg Resolution Time")).toBeInTheDocument();
  });

  it("shows N/A for avg resolution time when it is 0", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { ...STATS, avgResolutionTimeMs: 0 },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText("N/A")).toBeInTheDocument());
  });

  it("shows error message when the request fails", async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error("Network Error"));
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Failed to load dashboard stats.")).toBeInTheDocument()
    );
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TicketInfo from "./TicketInfo";

const PROPS = {
  subject: "Cannot login",
  fromName: "Jane Smith",
  fromEmail: "jane@example.com",
  createdAt: "2024-03-01T10:00:00Z",
  body: "I have been unable to log in for two days.",
};

describe("TicketInfo", () => {
  it("renders the subject", () => {
    render(<TicketInfo {...PROPS} />);
    expect(screen.getByText("Cannot login")).toBeInTheDocument();
  });

  it("renders the sender name and email", () => {
    render(<TicketInfo {...PROPS} />);
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText(/jane@example\.com/)).toBeInTheDocument();
  });

  it("renders the formatted date", () => {
    render(<TicketInfo {...PROPS} />);
    const expected = new Date(PROPS.createdAt).toLocaleString();
    expect(screen.getByText(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();
  });

  it("renders the message body", () => {
    render(<TicketInfo {...PROPS} />);
    expect(screen.getByText("I have been unable to log in for two days.")).toBeInTheDocument();
  });
});

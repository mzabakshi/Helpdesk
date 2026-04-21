import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { SenderType } from "core";
import ReplyThread from "./ReplyThread";
import { renderWithQuery } from "@/test/renderWithQuery";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

const TICKET_ID = "ticket-1";
const CUSTOMER_NAME = "Jane Smith";

const AGENT_REPLY = {
  id: "reply-1",
  body: "Thanks for reaching out!",
  senderType: SenderType.Agent,
  createdAt: "2024-03-01T11:00:00Z",
  author: { id: "agent-1", name: "Alice" },
};

const CUSTOMER_REPLY = {
  id: "reply-2",
  body: "Still having the issue.",
  senderType: SenderType.Customer,
  createdAt: "2024-03-01T12:00:00Z",
  author: null,
};

function mockGet(replies: unknown[] = []) {
  mockedAxios.get = vi.fn().mockResolvedValue({ data: replies });
}

function renderComponent() {
  return renderWithQuery(
    <ReplyThread ticketId={TICKET_ID} customerName={CUSTOMER_NAME} />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReplyThread", () => {
  it("shows the reply form", async () => {
    mockGet();
    renderComponent();

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Reply body" })).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Send reply" })).toBeInTheDocument();
  });

  it("does not show the Replies heading when there are no replies", async () => {
    mockGet([]);
    renderComponent();

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Reply body" })).toBeInTheDocument()
    );
    expect(screen.queryByText("Replies")).not.toBeInTheDocument();
  });

  it("renders agent replies with author name and (agent) label", async () => {
    mockGet([AGENT_REPLY]);
    renderComponent();

    await waitFor(() => screen.getByText("Thanks for reaching out!"));
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("(agent)")).toBeInTheDocument();
  });

  it("renders customer replies with customer name and (customer) label", async () => {
    mockGet([CUSTOMER_REPLY]);
    renderComponent();

    await waitFor(() => screen.getByText("Still having the issue."));
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("(customer)")).toBeInTheDocument();
  });

  it("submits a reply and clears the form on success", async () => {
    mockGet();
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { ...AGENT_REPLY, id: "reply-new" } });
    renderComponent();

    await waitFor(() => screen.getByRole("textbox", { name: "Reply body" }));

    await userEvent.type(screen.getByRole("textbox", { name: "Reply body" }), "Hello there!");
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/api/tickets/${TICKET_ID}/replies`,
        { body: "Hello there!" },
        expect.any(Object)
      )
    );

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Reply body" })).toHaveValue("")
    );
  });

  it("shows a validation error when submitting an empty reply", async () => {
    mockGet();
    renderComponent();

    await waitFor(() => screen.getByRole("button", { name: "Send reply" }));
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() =>
      expect(screen.getByText("Reply cannot be empty")).toBeInTheDocument()
    );
  });

  it("disables the submit button while the reply mutation is pending", async () => {
    mockGet();
    mockedAxios.post = vi.fn(() => new Promise(() => {}));
    renderComponent();

    await waitFor(() => screen.getByRole("textbox", { name: "Reply body" }));

    await userEvent.type(screen.getByRole("textbox", { name: "Reply body" }), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled()
    );
  });

  describe("Polish button", () => {
    it("renders the Polish button", async () => {
      mockGet();
      renderComponent();

      await waitFor(() => screen.getByRole("textbox", { name: "Reply body" }));
      expect(screen.getByRole("button", { name: /polish/i })).toBeInTheDocument();
    });

    it("is disabled when the textarea is empty", async () => {
      mockGet();
      renderComponent();

      await waitFor(() => screen.getByRole("textbox", { name: "Reply body" }));
      expect(screen.getByRole("button", { name: /polish/i })).toBeDisabled();
    });

    it("is enabled when the textarea has text", async () => {
      mockGet();
      renderComponent();

      await waitFor(() => screen.getByRole("textbox", { name: "Reply body" }));
      await userEvent.type(screen.getByRole("textbox", { name: "Reply body" }), "hello");

      expect(screen.getByRole("button", { name: /polish/i })).toBeEnabled();
    });

    it("calls the polish-reply endpoint and updates the textarea on success", async () => {
      mockGet();
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { body: "Dear Jane, polished text.\n\nBest regards,\nAgent" } });
      renderComponent();

      await waitFor(() => screen.getByRole("textbox", { name: "Reply body" }));
      await userEvent.type(screen.getByRole("textbox", { name: "Reply body" }), "hello");
      await userEvent.click(screen.getByRole("button", { name: /polish/i }));

      await waitFor(() =>
        expect(mockedAxios.post).toHaveBeenCalledWith(
          `/api/tickets/${TICKET_ID}/polish-reply`,
          { body: "hello" },
          expect.any(Object)
        )
      );

      await waitFor(() =>
        expect(screen.getByRole("textbox", { name: "Reply body" })).toHaveValue(
          "Dear Jane, polished text.\n\nBest regards,\nAgent"
        )
      );
    });

    it("shows 'Polishing…' and disables the button while pending", async () => {
      mockGet();
      mockedAxios.post = vi.fn(() => new Promise(() => {}));
      renderComponent();

      await waitFor(() => screen.getByRole("textbox", { name: "Reply body" }));
      await userEvent.type(screen.getByRole("textbox", { name: "Reply body" }), "hello");
      await userEvent.click(screen.getByRole("button", { name: /polish/i }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /polishing/i })).toBeDisabled()
      );
    });

    it("also disables Send reply while polishing", async () => {
      mockGet();
      mockedAxios.post = vi.fn(() => new Promise(() => {}));
      renderComponent();

      await waitFor(() => screen.getByRole("textbox", { name: "Reply body" }));
      await userEvent.type(screen.getByRole("textbox", { name: "Reply body" }), "hello");
      await userEvent.click(screen.getByRole("button", { name: /polish/i }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Send reply" })).toBeDisabled()
      );
    });

    it("shows an error when the polish request fails", async () => {
      mockGet();
      const err = Object.assign(new Error("AI error"), {
        isAxiosError: true,
        response: { data: { error: "Failed to polish reply" } },
      });
      mockedAxios.post = vi.fn().mockRejectedValue(err);
      vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never);
      renderComponent();

      await waitFor(() => screen.getByRole("textbox", { name: "Reply body" }));
      await userEvent.type(screen.getByRole("textbox", { name: "Reply body" }), "hello");
      await userEvent.click(screen.getByRole("button", { name: /polish/i }));

      await waitFor(() =>
        expect(screen.getByText("Failed to polish reply")).toBeInTheDocument()
      );
    });
  });

  it("shows an error when the reply submission fails", async () => {
    mockGet();
    const err = Object.assign(new Error("Server error"), {
      isAxiosError: true,
      response: { data: { error: "Failed to save reply" } },
    });
    mockedAxios.post = vi.fn().mockRejectedValue(err);
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never);
    renderComponent();

    await waitFor(() => screen.getByRole("textbox", { name: "Reply body" }));

    await userEvent.type(screen.getByRole("textbox", { name: "Reply body" }), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() =>
      expect(screen.getByText("Failed to save reply")).toBeInTheDocument()
    );
  });
});

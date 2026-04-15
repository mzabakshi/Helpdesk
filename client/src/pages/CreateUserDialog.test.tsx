import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import CreateUserDialog from "./CreateUserDialog";
import { renderWithQuery } from "@/test/renderWithQuery";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

function renderDialog(open = true, onOpenChange = vi.fn()) {
  return { onOpenChange, ...renderWithQuery(<CreateUserDialog open={open} onOpenChange={onOpenChange} />) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreateUserDialog", () => {
  describe("rendering", () => {
    it("renders the dialog with all fields when open", () => {
      renderDialog();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^create$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("does not render the dialog when closed", () => {
      renderDialog(false);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows an error when Name is empty", async () => {
      renderDialog();
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));
      await waitFor(() => expect(screen.getByText("Name is required.")).toBeInTheDocument());
    });

    it("shows an error when Name is too short", async () => {
      renderDialog();
      await userEvent.type(screen.getByLabelText("Name"), "ab");
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));
      await waitFor(() =>
        expect(screen.getByText("Name must be at least 3 characters.")).toBeInTheDocument()
      );
    });

    it("shows an error when Email is empty", async () => {
      renderDialog();
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));
      await waitFor(() => expect(screen.getByText("Email is required.")).toBeInTheDocument());
    });

    it("shows an error when Password is empty", async () => {
      renderDialog();
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));
      await waitFor(() => expect(screen.getByText("Password is required.")).toBeInTheDocument());
    });

    it("shows an error when Password is too short", async () => {
      renderDialog();
      await userEvent.type(screen.getByLabelText("Password"), "short");
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));
      await waitFor(() =>
        expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument()
      );
    });

    it("does not submit when validation fails", async () => {
      renderDialog();
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));
      await waitFor(() => screen.getByText("Name is required."));
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe("submission", () => {
    const VALID = { name: "Carol Agent", email: "carol@example.com", password: "secret123" };

    it("posts to /api/users with the form values", async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({ data: {} });
      renderDialog();

      await userEvent.type(screen.getByLabelText("Name"), VALID.name);
      await userEvent.type(screen.getByLabelText("Email"), VALID.email);
      await userEvent.type(screen.getByLabelText("Password"), VALID.password);
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

      await waitFor(() =>
        expect(mockedAxios.post).toHaveBeenCalledWith(
          "/api/users",
          expect.objectContaining({ name: VALID.name, email: VALID.email, password: VALID.password }),
          expect.objectContaining({ withCredentials: true })
        )
      );
    });

    it("shows a loading state while submitting", async () => {
      mockedAxios.post = vi.fn(() => new Promise(() => {})); // never resolves
      renderDialog();

      await userEvent.type(screen.getByLabelText("Name"), VALID.name);
      await userEvent.type(screen.getByLabelText("Email"), VALID.email);
      await userEvent.type(screen.getByLabelText("Password"), VALID.password);
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled()
      );
    });

    it("calls onOpenChange(false) after successful creation", async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({ data: {} });
      const { onOpenChange } = renderDialog();

      await userEvent.type(screen.getByLabelText("Name"), VALID.name);
      await userEvent.type(screen.getByLabelText("Email"), VALID.email);
      await userEvent.type(screen.getByLabelText("Password"), VALID.password);
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });
  });

  describe("server errors", () => {
    it("shows a server error message when creation fails", async () => {
      const err = Object.assign(new Error("Conflict"), {
        isAxiosError: true,
        response: { data: { error: "A user with that email already exists" } },
      });
      mockedAxios.post = vi.fn().mockRejectedValue(err);
      vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never);
      renderDialog();

      await userEvent.type(screen.getByLabelText("Name"), "Alice Admin");
      await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
      await userEvent.type(screen.getByLabelText("Password"), "secret123");
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

      await waitFor(() =>
        expect(screen.getByText("A user with that email already exists")).toBeInTheDocument()
      );
    });

    it("shows a fallback message for non-Axios errors", async () => {
      mockedAxios.post = vi.fn().mockRejectedValue(new Error("Network Error"));
      vi.spyOn(axios, "isAxiosError").mockReturnValue(false as never);
      renderDialog();

      await userEvent.type(screen.getByLabelText("Name"), "Alice Admin");
      await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
      await userEvent.type(screen.getByLabelText("Password"), "secret123");
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));

      await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
    });

    it("clears the server error when Cancel is clicked (handleOpenChange resets state)", async () => {
      const err = Object.assign(new Error("Conflict"), {
        isAxiosError: true,
        response: { data: { error: "Email already taken" } },
      });
      mockedAxios.post = vi.fn().mockRejectedValue(err);
      vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never);

      renderDialog();

      await userEvent.type(screen.getByLabelText("Name"), "Alice Admin");
      await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
      await userEvent.type(screen.getByLabelText("Password"), "secret123");
      await userEvent.click(screen.getByRole("button", { name: /^create$/i }));
      await waitFor(() => expect(screen.getByText("Email already taken")).toBeInTheDocument());

      // Clicking Cancel calls handleOpenChange(false) which resets serverError
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

      // The server error state is cleared (onOpenChange(false) was called)
      expect(screen.queryByText("Email already taken")).not.toBeInTheDocument();
    });
  });

  describe("cancel button", () => {
    it("calls onOpenChange(false) when Cancel is clicked", async () => {
      const { onOpenChange } = renderDialog();
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

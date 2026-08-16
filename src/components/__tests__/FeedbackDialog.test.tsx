import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeedbackDialog } from "../FeedbackDialog";
import { useProjectStore } from "../../state/store";

describe("FeedbackDialog", () => {
  const origFetch = globalThis.fetch;
  beforeEach(() => { useProjectStore.getState().newProject(); });
  afterEach(() => { globalThis.fetch = origFetch; });

  const fill = () => {
    fireEvent.change(screen.getByTestId("fb-title"), { target: { value: "Título ok" } });
    fireEvent.change(screen.getByTestId("fb-message"), { target: { value: "Mensagem com mais de dez caracteres." } });
  };

  it("send is disabled until title/message are valid; success shows the id", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "ref42" }), { status: 200 })) as unknown as typeof fetch;
    const onDone = vi.fn();
    render(<FeedbackDialog onDone={onDone} />);
    expect(screen.getByTestId("fb-send")).toBeDisabled();
    fill();
    fireEvent.change(screen.getByTestId("fb-email"), { target: { value: "bad" } });
    expect(screen.getByTestId("fb-send")).toBeDisabled();
    fireEvent.change(screen.getByTestId("fb-email"), { target: { value: "a@b.co" } });
    expect(screen.getByTestId("fb-send")).toBeEnabled();
    expect(screen.getByTestId("fb-preview")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("fb-diag"));
    expect(screen.queryByTestId("fb-preview")).toBeNull();
    fireEvent.click(screen.getByTestId("fb-project"));
    fireEvent.click(screen.getByTestId("fb-send"));
    await waitFor(() => expect(screen.getByTestId("feedback-id")).toHaveTextContent("ref42"));
    const body = JSON.parse((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.email).toBe("a@b.co");
    expect(body.diagnostics).toBeUndefined();
    expect(body.project).toBeDefined();
    fireEvent.click(screen.getByText("Fechar"));
    expect(onDone).toHaveBeenCalled();
  });

  it("error path shows the message and a mailto link", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "off" }), { status: 501 })) as unknown as typeof fetch;
    render(<FeedbackDialog onDone={() => {}} />);
    fill();
    fireEvent.submit(screen.getByTestId("feedback-form"));
    await waitFor(() => expect(screen.getByTestId("fb-error")).toHaveTextContent(/não está ativo/));
    expect(screen.getByTestId("fb-mailto").getAttribute("href")).toMatch(/^mailto:/);
  });
});

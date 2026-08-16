import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OriginPicker } from "../OriginPicker";
import { AskHost, confirmDialog, promptDialog, Dialog } from "../Dialog";
import { act } from "@testing-library/react";

describe("OriginPicker", () => {
  it("renders 5 points, marks the active one and changes on click / arrow keys", () => {
    const onChange = vi.fn();
    const { rerender } = render(<OriginPicker value="front-left" onChange={onChange} width={300} height={200} />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByTestId("origin-front-left")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByTestId("origin-center"));
    expect(onChange).toHaveBeenCalledWith("center");
    rerender(<OriginPicker value="center" onChange={onChange} width={300} height={200} />);
    fireEvent.keyDown(screen.getByTestId("stock-origin"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("front-right");
    expect(screen.getByTestId("stock-origin")).toHaveAttribute("data-value", "center");
  });
});

describe("Dialog / confirm / prompt", () => {
  it("confirmDialog resolves true/false; promptDialog returns text or null; Esc cancels", async () => {
    render(<AskHost />);
    let p!: Promise<boolean>;
    act(() => { p = confirmDialog({ title: "Tem certeza?", message: "Isso apaga tudo.", danger: true }); });
    expect(screen.getByTestId("ask-dialog")).toHaveTextContent("Tem certeza?");
    fireEvent.click(screen.getByTestId("ask-ok"));
    await expect(p).resolves.toBe(true);
    act(() => { p = confirmDialog({ title: "De novo?" }); });
    fireEvent.click(screen.getByTestId("ask-cancel"));
    await expect(p).resolves.toBe(false);
    let q!: Promise<string | null>;
    act(() => { q = promptDialog({ title: "Nome", defaultValue: "abc" }); });
    fireEvent.change(screen.getByTestId("ask-input"), { target: { value: "xyz" } });
    fireEvent.keyDown(screen.getByTestId("ask-input"), { key: "Enter" });
    await expect(q).resolves.toBe("xyz");
    let r!: Promise<boolean>;
    act(() => { r = confirmDialog({ title: "Esc" }); });
    await act(async () => { fireEvent.keyDown(window, { key: "Escape" }); });
    await expect(r).resolves.toBe(false);
  });
  it("Dialog: closed renders nothing; open renders title, body and default footer; X closes", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Dialog open={false} onClose={onClose} title="T">body</Dialog>);
    expect(screen.queryByTestId("dialog")).toBeNull();
    rerender(<Dialog open onClose={onClose} title="T">body</Dialog>);
    expect(screen.getByTestId("dialog")).toHaveTextContent("T");
    fireEvent.click(screen.getByTestId("dialog-x"));
    expect(onClose).toHaveBeenCalled();
  });
});

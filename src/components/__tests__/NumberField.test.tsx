import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NumberField } from "../NumberField";

describe("NumberField", () => {
  it("commits valid values and ignores invalid ones", () => {
    const onChange = vi.fn();
    render(<NumberField label="X" value={10} onChange={onChange} min={0} testId="f" />);
    const input = screen.getByTestId("f");
    fireEvent.change(input, { target: { value: "25" } });
    expect(onChange).toHaveBeenLastCalledWith(25);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.change(input, { target: { value: "-5" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("restores the last valid value on blur", () => {
    render(<NumberField label="X" value={10} onChange={() => {}} min={0} testId="f" />);
    const input = screen.getByTestId("f") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input.value).toBe("10");
  });

  it("arrow keys step (Shift ×10) and Enter blurs", () => {
    const onChange = vi.fn();
    render(<NumberField label="X" value={10} onChange={onChange} step={0.5} testId="f" />);
    const input = screen.getByTestId("f");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(10.5);
    fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(5);
    const blur = vi.spyOn(input as HTMLInputElement, "blur");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(blur).toHaveBeenCalled();
  });
  it("shows external dimensions when idle and preserves an in-progress edit", () => {
    const onChange = vi.fn();
    const { rerender } = render(<NumberField label="Width" value={40} onChange={onChange} testId="f" />);
    const input = screen.getByTestId("f");
    rerender(<NumberField label="Width" value={60} onChange={onChange} testId="f" />);
    expect(input).toHaveValue(60);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "100" } });
    rerender(<NumberField label="Width" value={80} onChange={onChange} testId="f" />);
    expect(input).toHaveValue(100);
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(100);
    expect(input).toHaveValue(80);
  });

  it("uses one unit for the default arrow-key step", () => {
    const onChange = vi.fn();
    render(<NumberField label="X" value={10} onChange={onChange} testId="f" />);
    fireEvent.keyDown(screen.getByTestId("f"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(11);
  });

});

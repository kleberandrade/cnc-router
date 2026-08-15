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
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { OverflowRibbon, type RibbonGroupDef } from "../Ribbon";
import { Square } from "lucide-react";

// jsdom has no layout: fake widths through getBoundingClientRect on group wrappers and clientWidth on the ribbon.
function fakeLayout(available: number, groupWidth: number) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get() { return this.classList.contains("ribbon") ? available : 0; } });
  HTMLElement.prototype.getBoundingClientRect = function () {
    const w = this.hasAttribute("data-rgroup") ? groupWidth : 0;
    return { width: w, height: 40, top: 0, left: 0, right: w, bottom: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
}

class RO { observe() {} disconnect() {} unobserve() {} }

const groups = (onClick: () => void): RibbonGroupDef[] => [
  { key: "a", title: "A", priority: 1, items: [{ icon: <Square />, label: "A1", onClick, testId: "a1" }] },
  { key: "b", title: "B", priority: 2, items: [{ icon: <Square />, label: "B1", onClick, testId: "b1" }] },
  { key: "c", title: "C", priority: 3, items: [{ icon: <Square />, label: "C1", onClick, testId: "c1", menu: [{ icon: <Square />, label: "C1a", onClick, testId: "c1a" }] }] },
];

describe("OverflowRibbon", () => {
  beforeEach(() => { (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO; });

  it("shows every group when there is room", async () => {
    fakeLayout(1000, 100);
    render(<OverflowRibbon groups={groups(() => {})} />);
    await act(async () => {});
    expect(screen.getByTestId("a1")).toBeInTheDocument();
    expect(screen.getByTestId("c1")).toBeInTheDocument();
    expect(screen.queryByTestId("ribbon-more")).toBeNull();
  });

  it("moves the lowest-priority groups into the Mais menu when space is short (same test ids inside)", async () => {
    fakeLayout(250, 100); // 3 × 108 = 324 > 250 → keep A (108) + Mais (60): B would need 216+60 = 276 > 250
    const onClick = vi.fn();
    render(<OverflowRibbon groups={groups(onClick)} />);
    await act(async () => {});
    expect(screen.getByTestId("a1")).toBeInTheDocument();
    expect(screen.queryByTestId("b1")).toBeNull();
    const more = screen.getByTestId("ribbon-more");
    fireEvent.click(more);
    expect(screen.getByTestId("more-b")).toBeInTheDocument();
    // dropdown items are flattened into the menu
    fireEvent.click(screen.getByTestId("c1a"));
    expect(onClick).toHaveBeenCalled();
    // menu closes after clicking
    expect(screen.queryByTestId("more-b")).toBeNull();
  });

  it("dropdown items open a popover with their sub-items", async () => {
    fakeLayout(1000, 100);
    const onClick = vi.fn();
    render(<OverflowRibbon groups={groups(onClick)} />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId("c1"));
    fireEvent.click(screen.getByTestId("c1a"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

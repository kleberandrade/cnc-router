import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmptyState } from "../EmptyState";
import { Tour, TOUR_STEPS, tourDone, resetTour } from "../Tour";
import { useProjectStore } from "../../state/store";
import { useUiStore, initUiPrefs } from "../../state/uiStore";

describe("EmptyState", () => {
  beforeEach(() => { useProjectStore.getState().newProject(); useUiStore.setState({ emptyDismissed: false }); });
  it("lists the 3 steps, the examples and opens one; close dismisses", async () => {
    const onTour = vi.fn();
    render(<EmptyState onTour={onTour} />);
    expect(screen.getByTestId("empty-state")).toHaveTextContent("Comece por aqui");
    expect(screen.getByTestId("example-suporte-celular")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("empty-tour"));
    expect(onTour).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("example-placa-furos"));
    await waitFor(() => expect(useProjectStore.getState().shapes.length).toBe(6));
    fireEvent.click(screen.getByTestId("empty-close"));
    expect(useUiStore.getState().emptyDismissed).toBe(true);
  });
  it("adds a rectangle from the card", () => {
    render(<EmptyState onTour={() => {}} />);
    fireEvent.click(screen.getByTestId("empty-add-rectangle"));
    expect(useProjectStore.getState().shapes).toHaveLength(1);
  });
});

describe("Tour", () => {
  beforeEach(() => resetTour());
  it("walks the steps, keyboard works, finishing marks it done", () => {
    const onClose = vi.fn();
    render(<Tour onClose={onClose} />);
    expect(screen.getByTestId("tour")).toHaveTextContent(`1/${TOUR_STEPS.length}`);
    fireEvent.click(screen.getByTestId("tour-next"));
    expect(screen.getByTestId("tour")).toHaveTextContent("2/");
    fireEvent.click(screen.getByTestId("tour-back"));
    expect(screen.getByTestId("tour")).toHaveTextContent("1/");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("tour")).toHaveTextContent("2/");
    for (let i = 0; i < TOUR_STEPS.length; i++) fireEvent.click(screen.getByTestId("tour-next"));
    expect(onClose).toHaveBeenCalled();
    expect(tourDone()).toBe(true);
  });
  it("skip closes and marks done; Esc too", () => {
    const onClose = vi.fn();
    render(<Tour onClose={onClose} />);
    fireEvent.click(screen.getByTestId("tour-skip"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(tourDone()).toBe(true);
    const onClose2 = vi.fn();
    resetTour();
    render(<Tour onClose={onClose2} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose2).toHaveBeenCalled();
  });
});

describe("density / text size prefs", () => {
  it("apply data attributes on <html> and persist", () => {
    useUiStore.getState().setDensity("comfortable");
    useUiStore.getState().setTextSize("large");
    expect(document.documentElement.getAttribute("data-density")).toBe("comfortable");
    expect(document.documentElement.getAttribute("data-text")).toBe("large");
    expect(localStorage.getItem("oficina-cnc:density")).toBe("comfortable");
    document.documentElement.removeAttribute("data-density");
    initUiPrefs();
    expect(document.documentElement.getAttribute("data-density")).toBe("comfortable");
    useUiStore.getState().setDensity("compact");
    useUiStore.getState().setTextSize("normal");
  });
});

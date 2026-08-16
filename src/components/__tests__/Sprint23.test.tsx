import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Timeline } from "../Timeline";
import { LegalContent, LegalLinks } from "../LegalDialog";
import { StorageNotice } from "../PwaBanner";
import { useProjectStore } from "../../state/store";
import { LEGAL } from "../../content/legal";

describe("Timeline", () => {
  beforeEach(() => { useProjectStore.getState().newProject(); useProjectStore.temporal.getState().clear(); });
  it("shows one marker per change, jumps back and forth, and replays", async () => {
    render(<Timeline />);
    expect(screen.queryByTestId("timeline")).toBeNull();
    act(() => { useProjectStore.getState().addShape({ id: "a", kind: "rectangle", x: 0, y: 0, width: 10, height: 10, rotation: 0, depth: 1, operation: "outline" }); });
    act(() => { useProjectStore.getState().updateShape("a", { x: 20 }); });
    expect(screen.getByTestId("timeline-count")).toHaveTextContent("2/2");
    expect(screen.getByTestId("timeline-2")).toHaveAttribute("aria-label", "Mover retângulo");
    fireEvent.click(screen.getByTestId("timeline-1"));
    expect((useProjectStore.getState().shapes[0] as { x: number }).x).toBe(0);
    expect(screen.getByTestId("timeline-count")).toHaveTextContent("1/2");
    fireEvent.click(screen.getByTestId("timeline-0"));
    expect(useProjectStore.getState().shapes).toHaveLength(0);
    fireEvent.click(screen.getByTestId("timeline-play"));
    await waitFor(() => expect(screen.getByTestId("timeline-count")).toHaveTextContent("2/2"), { timeout: 3000 });
    expect((useProjectStore.getState().shapes[0] as { x: number }).x).toBe(20);
  });
});

describe("Legal + storage notice", () => {
  it("renders the three documents and the links", () => {
    const opened: string[] = [];
    render(<><LegalLinks onOpen={(id) => opened.push(id)} /><LegalContent id="privacidade" /></>);
    expect(LEGAL.map((d) => d.id)).toEqual(["privacidade", "cookies", "termos"]);
    expect(screen.getByTestId("legal-privacidade")).toHaveTextContent("LGPD");
    fireEvent.click(screen.getByTestId("open-legal-termos"));
    expect(opened).toEqual(["termos"]);
  });
  it("storage notice shows once and remembers dismissal", () => {
    localStorage.removeItem("oficina-cnc:storage-notice");
    const { unmount } = render(<StorageNotice onLegal={() => {}} />);
    expect(screen.getByTestId("storage-notice")).toHaveTextContent("Sem cookies");
    fireEvent.click(screen.getByTestId("storage-notice-ok"));
    expect(screen.queryByTestId("storage-notice")).toBeNull();
    unmount();
    render(<StorageNotice onLegal={() => {}} />);
    expect(screen.queryByTestId("storage-notice")).toBeNull();
  });
});

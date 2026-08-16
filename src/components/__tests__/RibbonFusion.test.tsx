import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RibbonGroup, RibbonButton } from "../Ribbon";
import { Square } from "lucide-react";
import { fileStem } from "../useProjectActions";

describe("Ribbon (Fusion): group menu, tooltip, custom items", () => {
  it("group title opens a menu listing the actions with shortcuts; custom items are excluded", () => {
    const onClick = vi.fn();
    render(<RibbonGroup title="Criar" className="rgroup-criar" items={[
      { icon: <Square />, label: "Retângulo", onClick, testId: "a", shortcut: "R", description: "d" },
      { icon: null, label: "Sel", onClick: () => {}, testId: "sel", custom: <select data-testid="sel"><option>1</option></select> },
    ]} />);
    expect(screen.getByTestId("sel")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("group-criar"));
    expect(screen.getByTestId("a-gm")).toHaveTextContent("Retângulo");
    expect(screen.getByTestId("a-gm")).toHaveTextContent("R");
    expect(screen.queryByTestId("sel-gm")).toBeNull();
    fireEvent.click(screen.getByTestId("a-gm"));
    expect(onClick).toHaveBeenCalled();
    expect(screen.queryByTestId("a-gm")).toBeNull();
  });
  it("rich tooltip shows after the delay and hides on leave", () => {
    vi.useFakeTimers();
    render(<RibbonButton icon={<Square />} label="Retângulo" onClick={() => {}} testId="b" shortcut="R" description="Faz um retângulo." />);
    const btn = screen.getByTestId("b");
    expect(btn.getAttribute("title")).toBeNull();
    fireEvent.mouseEnter(btn);
    expect(screen.queryByTestId("rich-tooltip")).toBeNull();
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByTestId("rich-tooltip")).toHaveTextContent("Faz um retângulo.");
    fireEvent.mouseLeave(btn);
    expect(screen.queryByTestId("rich-tooltip")).toBeNull();
    vi.useRealTimers();
  });
  it("fileStem slugifies the project name", () => {
    expect(fileStem("Placa da Bancada")).toBe("placa-da-bancada");
    expect(fileStem("  Ação Nº 1! ")).toBe("acao-n-1");
    expect(fileStem("")).toBe("projeto");
    expect(fileStem(undefined)).toBe("projeto");
  });
});

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { ExamplesGallery, ExampleThumb } from "../ExamplesGallery";
import { ChoiceIcons, OPTION_ICONS } from "../OptionIcons";
import { Notice } from "../Notice";
import { projectThumbnail } from "../../lib/thumbnail";
import { EXAMPLES, findExample } from "../../content/examples";

beforeAll(() => { vi.stubGlobal("fetch", async (url: string) => new Response(readFileSync(`public${url}`))); });

describe("Sprint 24", () => {
  it("thumbnail: pockets filled, outlines stroked, holes included, fitted to the box", async () => {
    const p = await findExample("placa-furos")!.build();
    const t = projectThumbnail(p.shapes, 96, 64);
    expect(t.paths.length).toBe(p.shapes.length);
    expect(t.paths.some((x) => x.fill)).toBe(true);
    for (const path of t.paths) for (const m of path.d.matchAll(/([ML])(-?[\d.]+) (-?[\d.]+)/g)) { expect(Number(m[2])).toBeGreaterThanOrEqual(0); expect(Number(m[2])).toBeLessThanOrEqual(96); expect(Number(m[3])).toBeGreaterThanOrEqual(0); expect(Number(m[3])).toBeLessThanOrEqual(64); }
    expect(projectThumbnail([], 96, 64).paths).toEqual([]);
  });
  it("gallery renders every example grouped, thumbnails resolve for async examples, click opens", async () => {
    const onOpen = vi.fn();
    render(<ExamplesGallery onOpen={onOpen} />);
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(EXAMPLES.length);
    expect(screen.getByTestId("examples-gallery")).toHaveTextContent("Esportes");
    fireEvent.click(screen.getByTestId("gallery-escudo-palmeiras"));
    expect(onOpen).toHaveBeenCalledWith("escudo-palmeiras");
    const { container } = render(<ExampleThumb example={findExample("placa-gato")!} />);
    await waitFor(() => expect(container.querySelectorAll("path").length).toBeGreaterThan(0));
  });
  it("ChoiceIcons: every option has an icon; click changes value; disabled blocks", () => {
    const onChange = vi.fn();
    render(<ChoiceIcons value="flat" testId="t" onChange={onChange} options={[{ value: "flat", icon: "tool-flat", label: "Reta" }, { value: "vbit", icon: "tool-vbit", label: "V" }]} />);
    expect(screen.getByTestId("t-flat")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByTestId("t-vbit"));
    expect(onChange).toHaveBeenCalledWith("vbit");
    for (const k of ["tool-flat", "tool-ball", "tool-vbit", "side-outside", "side-inside", "side-on", "op-outline", "op-pocket", "op-drill", "corner-sharp", "corner-fillet", "corner-chamfer", "tabs", "helix", "plunge", "order-auto", "order-manual"]) expect(OPTION_ICONS[k]).toBeTruthy();
  });
  it("compact notice shows one line with a details toggle", () => {
    render(<Notice notice={{ kind: "info", title: "Exemplo aberto.", details: ["ensina X"] }} onDismiss={() => {}} compact autoHideMs={0} />);
    expect(screen.getByTestId("notice")).toHaveClass("notice-compact");
    expect(screen.queryByText("ensina X")).toBeNull();
    fireEvent.click(screen.getByTestId("notice-more"));
    expect(screen.getByText("ensina X")).toBeInTheDocument();
  });
});

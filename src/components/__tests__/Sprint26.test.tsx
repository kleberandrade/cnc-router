import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { ExamplesGallery } from "../ExamplesGallery";
import { EXAMPLES } from "../../content/examples";

beforeAll(() => { vi.stubGlobal("fetch", async (url: string) => new Response(readFileSync(`public${url}`))); });

describe("sprint 26: filtro da galeria", () => {
  it("chips filtram por tag, contagem bate, busca compõe, vazio avisa", () => {
    render(<ExamplesGallery onOpen={() => {}} />);
    expect(document.querySelectorAll(".ex-card")).toHaveLength(EXAMPLES.length);
    fireEvent.click(screen.getByTestId("ex-tag-encaixe"));
    const n = EXAMPLES.filter((e) => e.tags.includes("encaixe")).length;
    expect(document.querySelectorAll(".ex-card")).toHaveLength(n);
    expect(screen.getByTestId("ex-tag-encaixe")).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByTestId("ex-search"), { target: { value: "celular" } });
    expect(document.querySelectorAll(".ex-card")).toHaveLength(1);
    fireEvent.change(screen.getByTestId("ex-search"), { target: { value: "zzzz" } });
    expect(screen.getByTestId("ex-empty")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("ex-tag-all"));
    fireEvent.change(screen.getByTestId("ex-search"), { target: { value: "" } });
    expect(document.querySelectorAll(".ex-card")).toHaveLength(EXAMPLES.length);
  });
});

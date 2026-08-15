import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrandMark } from "../BrandMark";

describe("BrandMark", () => {
  it("renders an inline SVG mark", () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders the filled app-icon variant", () => {
    const { container } = render(<BrandMark filled size={32} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "32");
    expect(svg?.querySelector("rect[fill='#16283d']")).toBeTruthy();
  });
});

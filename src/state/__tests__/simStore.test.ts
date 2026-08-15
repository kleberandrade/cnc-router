import { describe, it, expect, beforeEach } from "vitest";
import { useSimStore } from "../simStore";

const S = () => useSimStore.getState();

describe("useSimStore", () => {
  beforeEach(() => {
    S().configure(10, [2, 5, 10]);
    S().setSpeed(1);
    S().setStepMode("segment");
  });

  it("configure resets time and pauses", () => {
    S().play();
    S().configure(4, [4]);
    expect(S().t).toBe(0);
    expect(S().playing).toBe(false);
    expect(S().duration).toBe(4);
  });

  it("tick advances scaled by speed and auto-pauses at the end", () => {
    S().play();
    S().tick(1);
    expect(S().t).toBe(1);
    S().setSpeed(4);
    S().tick(1);
    expect(S().t).toBe(5);
    S().tick(10);
    expect(S().t).toBe(10);
    expect(S().playing).toBe(false);
  });

  it("tick does nothing while paused", () => {
    S().tick(1);
    expect(S().t).toBe(0);
  });

  it("play from the end restarts", () => {
    S().toEnd();
    expect(S().t).toBe(10);
    S().play();
    expect(S().t).toBe(0);
    expect(S().playing).toBe(true);
  });

  it("does not play with zero duration", () => {
    S().configure(0, []);
    S().play();
    expect(S().playing).toBe(false);
  });

  it("seek clamps to [0, duration]", () => {
    S().seek(-3);
    expect(S().t).toBe(0);
    S().seek(99);
    expect(S().t).toBe(10);
    S().seek(3.5);
    expect(S().t).toBe(3.5);
  });

  it("stepForward/stepBack stop exactly on boundaries and pause", () => {
    S().play();
    S().stepForward();
    expect(S().t).toBe(2);
    expect(S().playing).toBe(false);
    S().stepForward();
    expect(S().t).toBe(5);
    S().seek(6);
    S().stepBack();
    expect(S().t).toBe(5);
    S().stepBack();
    S().stepBack();
    S().stepBack();
    expect(S().t).toBe(0);
    S().toEnd();
    S().stepForward();
    expect(S().t).toBe(10);
  });

  it("toggle flips playing; reset goes to start", () => {
    S().toggle();
    expect(S().playing).toBe(true);
    S().toggle();
    expect(S().playing).toBe(false);
    S().seek(4);
    S().reset();
    expect(S().t).toBe(0);
  });
});

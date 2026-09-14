import { describe, expect, it } from "vitest";
import { elementMatchup } from "./elements";

describe("elementMatchup", () => {
  it("doubles Fire on Earth, cuts Fire on Water, and leaves Fire on Wind or Fire alone", () => {
    expect(elementMatchup("Fire", "Earth")).toBe(2);
    expect(elementMatchup("Fire", "Water")).toBe(0.7);
    expect(elementMatchup("Fire", "Wind")).toBe(1);
    expect(elementMatchup("Fire", "Fire")).toBe(1);
    expect(elementMatchup("Water", "Fire")).toBe(2);
    expect(elementMatchup("Earth", "Wind")).toBe(2);
    expect(elementMatchup("Wind", "Water")).toBe(2);
    expect(elementMatchup(null, "Fire")).toBe(1);
    expect(elementMatchup("Fire", null)).toBe(1);
  });
});

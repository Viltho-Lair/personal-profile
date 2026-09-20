import { describe, expect, it } from "vitest";
import { primeFamiliar, starBand, weaponArt, weaponTier } from "./prime-familiar";

const body = (name: string, stars: number) => `/art/familiars/${name.toLowerCase()}-${stars}.png`;

describe("starBand", () => {
  it("bands stars the way the art is banded", () => {
    expect([0, 3, 5].map(starBand)).toEqual([0, 0, 0]);
    expect([6, 7].map(starBand)).toEqual([1, 1]);
    expect([8, 9].map(starBand)).toEqual([2, 2]);
    expect(starBand(10)).toBe(3);
    expect(starBand(11)).toBe(4);
  });
});

describe("weaponTier", () => {
  it("steps up with the weapon familiar's art, and stops at the last tier", () => {
    expect([0, 6, 8, 10, 11].map(weaponTier)).toEqual([1, 2, 3, 4, 4]);
  });
});

describe("weaponArt", () => {
  it("names the sprite for the weapon, the element and the stars", () => {
    expect(weaponArt("Na", "Fire", 0)).toBe("/art/familiars/prime/spear-fire-1.png");
    expect(weaponArt("Mus", "wind", 9)).toBe("/art/familiars/prime/wand-wind-3.png");
  });

  it("has no sprite without a weapon familiar or an element", () => {
    expect(weaponArt(null, "Fire", 5)).toBeNull();
    expect(weaponArt("Ku", "Fire", 5)).toBeNull();
    expect(weaponArt("Na", null, 5)).toBeNull();
  });
});

describe("primeFamiliar", () => {
  it("takes the body from the battle familiar and the element from the attribute one", () => {
    const prime = primeFamiliar(
      {
        attribute: { name: "Hi", stars: 4, element: "Fire" },
        battle: { name: "Ku", stars: 8 },
        weapon: { name: "Ru", stars: 11 },
      },
      body,
    );
    expect(prime).toEqual({
      body: "/art/familiars/ku-8.png",
      weapon: "/art/familiars/prime/scythe-fire-4.png",
      element: "fire",
      tier: 4,
    });
  });

  it("is nothing until all three slots are filled", () => {
    const parts = {
      attribute: { name: "Hi", stars: 4, element: "Fire" },
      battle: null,
      weapon: { name: "Ru", stars: 2 },
    };
    expect(primeFamiliar(parts, body)).toBeNull();
  });
});

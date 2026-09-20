"use client";

import { useId } from "react";
import { primeFamiliar, type PrimeFamiliar } from "@/lib/game/prime-familiar";
import { FAMILIAR_BY_NAME, familiarArt } from "./data";

/**
 * The prime familiar: the three equipped familiars drawn as the one creature
 * they are in game. The battle familiar is the body, recoloured to the
 * attribute familiar's element, holding the weapon familiar's weapon.
 */

/** The elements' own colours, as the game paints its familiars. */
const ELEMENT_RGB: Record<string, [number, number, number]> = {
  fire: [246, 71, 63],
  water: [76, 176, 249],
  wind: [100, 230, 154],
  earth: [245, 155, 37],
};

/** Art is 128 px, and both layers are drawn on a 128 x 128 square. */
export const PRIME_NATIVE = 128;
const NATIVE = PRIME_NATIVE;

/**
 * A colour matrix that paints a sprite in one colour and keeps its shading:
 * every pixel becomes the element's colour at its own brightness. The lift
 * puts the brightest pixels at the full colour, as the art's own highlights
 * are well below white.
 */
function tintMatrix(element: string | null): string | null {
  const rgb = element ? ELEMENT_RGB[element] : undefined;
  if (!rgb) return null;
  const lift = 1.45;
  const [r, g, b] = rgb.map((channel) => (channel / 255) * lift);
  const row = (channel: number) => `${0.299 * channel} ${0.587 * channel} ${0.114 * channel} 0 0`;
  return `${row(r)} ${row(g)} ${row(b)} 0 0 0 1 0`;
}

/** What the three slots combine into, with each familiar's art looked up by name. */
export function primeFrom(parts: {
  attribute: { name: string; stars: number } | null;
  battle: { name: string; stars: number } | null;
  weapon: { name: string; stars: number } | null;
}): PrimeFamiliar | null {
  const attribute = parts.attribute ? FAMILIAR_BY_NAME.get(parts.attribute.name) : undefined;
  return primeFamiliar(
    {
      attribute: parts.attribute ? { ...parts.attribute, element: attribute?.element ?? null } : null,
      battle: parts.battle,
      weapon: parts.weapon,
    },
    (name, stars) => {
      const familiar = FAMILIAR_BY_NAME.get(name);
      return familiar ? (familiarArt(familiar, stars).icon ?? null) : null;
    },
  );
}

/**
 * Both layers on a 128 x 128 square, for a caller that already has an <svg>:
 * the renderer draws them in the field, the tile in a box of its own.
 */
export function PrimeLayers({ prime, filterId }: { prime: PrimeFamiliar; filterId: string }) {
  const matrix = tintMatrix(prime.element);
  return (
    <>
      {matrix ? (
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={matrix} />
        </filter>
      ) : null}
      {prime.body ? (
        <image
          href={prime.body}
          x={0}
          y={0}
          width={NATIVE}
          height={NATIVE}
          filter={matrix ? `url(#${filterId})` : undefined}
          style={{ imageRendering: "pixelated" }}
        />
      ) : null}
      {/* The weapon is held out to the creature's side, tipped as the game holds it. */}
      {prime.weapon ? (
        <image
          href={prime.weapon}
          x={NATIVE * 0.44}
          y={NATIVE * 0.12}
          width={NATIVE * 0.5}
          height={NATIVE * 0.5}
          transform={`rotate(-10 ${NATIVE * 0.69} ${NATIVE * 0.37})`}
          style={{ imageRendering: "pixelated" }}
        />
      ) : null}
    </>
  );
}

/** The prime familiar as one picture, at any size. */
export function PrimeFamiliarArt({
  prime,
  size,
  className = "",
}: {
  prime: PrimeFamiliar;
  size: number;
  className?: string;
}) {
  const filterId = useId();
  return (
    <svg
      viewBox={`0 0 ${NATIVE} ${NATIVE}`}
      width={size}
      height={size}
      role="img"
      aria-label="Prime familiar"
      className={`shrink-0 ${className}`}
    >
      <PrimeLayers prime={prime} filterId={filterId} />
    </svg>
  );
}

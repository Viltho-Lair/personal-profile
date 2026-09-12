import type { CSSProperties, Ref } from "react";

type Piece = {
  name: string;
  /** Direction the piece travels when the mark opens up. */
  dx: number;
  dy: number;
  /** Stagger for the entry animation. */
  delay: string;
  polygons: { fill: string; points: string }[];
};

const PIECES: Piece[] = [
  {
    name: "blue",
    dx: -18,
    dy: -24,
    delay: "0ms",
    polygons: [
      { fill: "#48c9ec", points: "40,95 204,0 367,95 40,284" },
      { fill: "#8be4ff", points: "367,95 367,282 204,189" },
    ],
  },
  {
    name: "orange",
    dx: 30,
    dy: 4,
    delay: "110ms",
    polygons: [
      { fill: "#ff9e03", points: "397,108 559,203 559,392 397,486" },
      { fill: "#ffb547", points: "233,390 397,297 397,486" },
    ],
  },
  {
    name: "red",
    dx: -16,
    dy: 26,
    delay: "220ms",
    polygons: [
      { fill: "#ff3236", points: "40,318 367,505 204,599 40,505" },
      { fill: "#ff8687", points: "40,318 204,224 204,410" },
    ],
  },
];

export function LogoMark({
  ref,
  className,
}: {
  ref?: Ref<SVGSVGElement>;
  className?: string;
}) {
  return (
    <svg
      ref={ref}
      viewBox="40 0 519 599"
      aria-hidden
      focusable="false"
      className={`mark ${className ?? ""}`}
    >
      {PIECES.map((piece) => (
        <g
          key={piece.name}
          className="piece"
          style={
            {
              "--dx": piece.dx,
              "--dy": piece.dy,
              "--d": piece.delay,
            } as CSSProperties
          }
        >
          {piece.polygons.map((polygon) => (
            <polygon key={polygon.points} {...polygon} />
          ))}
        </g>
      ))}
    </svg>
  );
}

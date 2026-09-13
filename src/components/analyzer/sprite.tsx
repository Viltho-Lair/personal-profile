import Image from "next/image";

/** The art's real pixel width, recorded per item by the extractor. */
export type NativeSize = number;

/**
 * Game art is pixel art at 64 or 128 px. Two things blur it: the image
 * optimizer resampling it to arbitrary widths (switched off in next.config),
 * and display sizes that aren't a clean ratio of the source.
 *
 * So a sprite is always shown at an exact ratio of its native size. At or
 * above native size it scales nearest-neighbour, which keeps every pixel
 * hard-edged. Below native size it scales smoothly instead: most of the
 * 128 px art has genuine single-pixel detail, and nearest-neighbour
 * shrinking would drop every other pixel.
 */
export function Sprite({
  src,
  native,
  size,
  className = "",
}: {
  src: string;
  native: NativeSize;
  size: number;
  className?: string;
}) {
  const ratio = size >= native ? size / native : native / size;
  if (process.env.NODE_ENV !== "production" && !Number.isInteger(ratio)) {
    console.warn(
      `Sprite ${src}: ${size}px is not a clean ratio of its ${native}px source`,
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 object-contain ${size >= native ? "[image-rendering:pixelated]" : ""} ${className}`}
    />
  );
}

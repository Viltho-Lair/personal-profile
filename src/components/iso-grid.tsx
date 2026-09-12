export function IsoGrid() {
  return (
    <svg
      aria-hidden
      className="iso-grid pointer-events-none fixed inset-0 -z-10 h-full w-full"
    >
      <defs>
        <pattern
          id="iso"
          width="83.14"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 0V48M41.57 0V48M0 0L83.14 48M0 48L83.14 0" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#iso)" />
    </svg>
  );
}

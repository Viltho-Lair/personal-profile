import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every image here is small pixel art. The optimizer resamples it to
  // srcset widths with smoothing, which blurs it, so serve the originals.
  images: { unoptimized: true },
};

export default nextConfig;

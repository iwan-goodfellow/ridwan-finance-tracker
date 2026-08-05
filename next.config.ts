import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const withPWANext = withPWA({
  dest: "public",
});

const nextConfig: NextConfig = {};

export default withPWANext(nextConfig);
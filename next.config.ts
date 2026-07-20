import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

const withMDX = createMDX({});

export default withMDX(nextConfig);

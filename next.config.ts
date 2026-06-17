import type { NextConfig } from "next";
import { networkInterfaces } from "os";

// Auto-detect this machine's LAN IPv4 addresses so the dev server accepts
// cross-origin requests from other devices on the network (phones, tablets,
// other laptops) without hardcoding a specific IP like 192.168.1.140.
const localDevOrigins = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net && net.family === "IPv4" && !net.internal)
  .map((net) => net!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: localDevOrigins,
};

export default nextConfig;

import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheStartUrl: true,
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: "/login",
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    importScripts: ["push-handler.js"],
    runtimeCaching: [
      {
        urlPattern: ({ url }: { url: URL }) =>
          url.pathname === "/dashboard" ||
          url.pathname.startsWith("/dashboard/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pausalac-dashboard",
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 8,
            maxAgeSeconds: 60 * 60 * 24,
          },
        },
      },
      {
        urlPattern: ({ url }: { url: URL }) =>
          url.pathname.startsWith("/api/kurs"),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "pausalac-dashboard-kurs",
          expiration: {
            maxEntries: 48,
            maxAgeSeconds: 60 * 60 * 24,
          },
        },
      },
    ],
  },
});

export default withPWA(nextConfig);

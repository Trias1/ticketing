const path = require("path");

const isDev = process.env.NODE_ENV !== "production";

// CSP: skrip & koneksi hanya ke origin sendiri; gambar boleh dari https (avatar Cloudinary,
// gambar di markdown). 'unsafe-eval' hanya untuk dev (React Refresh).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ada lockfile lain di folder induk; tetapkan root project ini secara eksplisit.
  outputFileTracingRoot: path.join(__dirname),
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  // App tidak memakai next/image. Image Optimizer dimatikan untuk menutup celah RCE/DoS
  // di /_next/image pada Next 14 (GHSA-2xp9-vwfh-vxw4, GHSA-h64f-5h5j-jqjh) sampai upgrade ke Next 15.5.24+.
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

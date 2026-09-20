/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@moss-dev/moss",
    "@moss-dev/moss-core",
  ],

  turbopack: {
    resolveAlias: {
      "onnxruntime-node": {
        browser: "onnxruntime-web",
        default: "onnxruntime-web",
      },
    },
  },
};

export default nextConfig;
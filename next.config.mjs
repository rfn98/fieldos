/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@moss-dev/moss",
    "@moss-dev/moss-core",
    "@huggingface/transformers",
    "onnxruntime-node",
  ],
};

export default nextConfig;

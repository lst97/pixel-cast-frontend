import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	serverExternalPackages: ["@livekit/node", "livekit-server-sdk"],
	turbopack: {
		resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
	},
	webpack: (config, { isServer }) => {
		// Handle Web Workers
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
			};
		}
		return config;
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "Cross-Origin-Embedder-Policy",
						value: "require-corp",
					},
					{
						key: "Cross-Origin-Opener-Policy",
						value: "same-origin",
					},
				],
			},
		];
	},
};

export default nextConfig;

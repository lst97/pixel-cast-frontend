import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
	env: {
		NEXT_PUBLIC_FRONTEND_BASE_URL: process.env.NEXT_PUBLIC_FRONTEND_BASE_URL,
		NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
		NEXT_PUBLIC_SRS_HTTP_API_URL: process.env.NEXT_PUBLIC_SRS_HTTP_API_URL,
		NEXT_PUBLIC_SRS_RTMP_URL: process.env.NEXT_PUBLIC_SRS_RTMP_URL,
		NEXT_PUBLIC_SRS_HLS_URL: process.env.NEXT_PUBLIC_SRS_HLS_URL,
		NEXT_PUBLIC_SRS_WEBRTC_URL: process.env.NEXT_PUBLIC_SRS_WEBRTC_URL,
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

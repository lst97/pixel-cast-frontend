// API Configuration
export const API_CONFIG = {
	// Deno backend URL
	BASE_URL:
		process.env.NEXT_PUBLIC_BACKEND_URL ||
		(process.env.NODE_ENV === "production"
			? "https://your-backend-domain.com" // Replace with your production URL
			: "http://localhost:3001"),

	// SRS Direct URLs (for development/debug only)
	SRS_DIRECT: {
		API: process.env.NEXT_PUBLIC_SRS_API_URL || "http://158.179.18.186:1985",
		WEBRTC:
			process.env.NEXT_PUBLIC_SRS_WEBRTC_URL || "http://158.179.18.186:8000",
		HTTP: process.env.NEXT_PUBLIC_SRS_HTTP_URL || "http://158.179.18.186:8080",
	},
} as const;

// API Endpoints
export const ENDPOINTS = {
	// Authentication
	TOKEN: "/api/token",

	// SRS Webhooks (handled by backend)
	SRS: {
		CONNECT: "/api/srs/connect",
		CLOSE: "/api/srs/close",
		PUBLISH: "/api/srs/publish",
		UNPUBLISH: "/api/srs/unpublish",
		PLAY: "/api/srs/play",
	},

	// SRS Proxy
	SRS_PROXY: {
		WHIP: "/api/srs-proxy/whip",
		WHEP: "/api/srs-proxy/whep",
		STREAMS: "/api/srs-proxy/streams",
		STREAMS_STOP: "/api/srs-proxy/streams/stop",
		STREAMS_SSE: "/api/srs-proxy/streams/sse",
		PRESENCE: "/api/srs-proxy/presence",
		MONITOR: "/api/srs-proxy/monitor",
	},

	// RTMP & HLS
	RTMP: {
		INGEST: "/api/rtmp/ingest",
		STATUS: "/api/rtmp/status",
	},
	HLS: {
		PLAYER: "/api/hls/player",
	},

	// Room Management
	ROOMS: {
		CREATE: "/api/rooms",
		LIST: "/api/rooms",
		BY_STREAM_KEY: "/api/rooms/by-stream-key",
		VALIDATE: "/api/rooms/validate",
	},

	// Health
	HEALTH: "/health",
} as const;

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
	return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to build API URLs with query parameters
export const buildApiUrlWithParams = (
	endpoint: string,
	params: Record<string, string>
): string => {
	const url = new URL(endpoint, API_CONFIG.BASE_URL);
	Object.entries(params).forEach(([key, value]) => {
		url.searchParams.set(key, value);
	});
	return url.toString();
};

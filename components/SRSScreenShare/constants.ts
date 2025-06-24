import { ResolutionOption, FrameRateOption } from "./types";

// Screen sharing resolution options
export const RESOLUTION_OPTIONS: ResolutionOption[] = [
	{ label: "1280x720 (HD)", value: "1280x720" },
	{ label: "1920x1080 (Full HD)", value: "1920x1080" },
	{ label: "2560x1440 (2K)", value: "2560x1440" },
	{ label: "3840x2160 (4K)", value: "3840x2160" },
];

// Frame rate options
export const FRAME_RATE_OPTIONS: FrameRateOption[] = [
	{ label: "15 FPS", value: 15 },
	{ label: "30 FPS", value: 30 },
	{ label: "60 FPS", value: 60 },
];

// Note: Stream polling has been replaced with Server-Sent Events (SSE) for real-time updates // 3 seconds
export const PRESENCE_HEARTBEAT_INTERVAL = 20000; // 20 seconds

// Buffer management
export const MAX_BUFFER_DELAY = 0.1; // 100ms
export const MIN_BUFFER_SIZE = 0.01; // 10ms
export const LARGE_BUFFER_THRESHOLD = 0.5; // 500ms
export const OPTIMAL_BUFFER_SIZE = 0.1; // 100ms

// Frame drop threshold
export const FRAME_DROP_THRESHOLD = 0.05; // 5%

// Retry configuration
export const MAX_WHIP_RETRIES = 3;
export const BASE_RETRY_DELAY = 1000; // 1 second

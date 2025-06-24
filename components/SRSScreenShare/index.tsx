// Main component
export { default as SRSScreenShare } from "./SRSScreenShare";
export { SRSScreenShare as default } from "./SRSScreenShare";

// Sub-components
export { RemoteVideo } from "./components/RemoteVideo";
export { LocalThumbnailVideo } from "./components/LocalThumbnailVideo";
export { ParticipantsSidebar } from "./components/ParticipantsSidebar";

// Types
export type {
	SRSConfig,
	SRSScreenShareProps,
	Participant,
	StreamInfo,
	SRSStreamsResponse,
	MediaCapabilities,
	ResolutionOption,
	FrameRateOption,
	VideoFrameMetadata,
} from "./types";

// Utils
export {
	createUltraLowLatencyPeerConnection,
	optimizeSdpForLowLatency,
	configureLowLatencyEncoding,
} from "./utils/webrtc";

export {
	applyAdvancedLatencyOptimizations,
	createFrameCallback,
	monitorFrameDrops,
	setupLowLatencyVideoElement,
} from "./utils/latencyOptimization";

// Constants
export {
	RESOLUTION_OPTIONS,
	FRAME_RATE_OPTIONS,
	PRESENCE_HEARTBEAT_INTERVAL,
	MAX_BUFFER_DELAY,
	MIN_BUFFER_SIZE,
	LARGE_BUFFER_THRESHOLD,
	OPTIMAL_BUFFER_SIZE,
	FRAME_DROP_THRESHOLD,
	MAX_WHIP_RETRIES,
	BASE_RETRY_DELAY,
} from "./constants";

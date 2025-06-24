export interface SRSConfig {
	streamKey: string;
	whipUrl: string;
	whepUrl: string;
	hlsUrl: string;
	roomName: string;
	identity: string;
	name: string;
	iceServers: RTCIceServer[];
}

export interface SRSScreenShareProps {
	config: SRSConfig;
	onDisconnect: () => void;
}

export interface Participant {
	identity: string;
	name: string;
	isSharing: boolean;
	streamUrl: string;
}

export interface StreamInfo {
	id: string;
	app: string;
	name: string;
	publish: {
		active: boolean;
		cid?: string;
	};
	video?: {
		codec: string;
		profile?: string;
		level?: string;
		width?: number;
		height?: number;
	};
	audio?: {
		codec: string;
		sample_rate?: number;
		channel?: number;
		profile?: string;
	};
	// Additional fields that SRS might include
	vhost?: string;
	tcUrl?: string;
	url?: string;
	live_ms?: number;
	clients?: number;
	frames?: number;
	send_bytes?: number;
	recv_bytes?: number;
	kbps?: {
		recv_30s?: number;
		send_30s?: number;
	};
}

export interface SRSStreamsResponse {
	streams?: StreamInfo[];
}

export interface MediaCapabilities {
	hasVideo: boolean;
	hasAudio: boolean;
}

export interface ResolutionOption {
	label: string;
	value: string;
}

export interface FrameRateOption {
	label: string;
	value: number;
}

export interface VideoFrameMetadata {
	presentationTime?: number;
	expectedDisplayTime?: number;
	processingDuration?: number;
}

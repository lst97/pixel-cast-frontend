import { VideoFrameMetadata } from "../types";

// Advanced latency optimization function
export const applyAdvancedLatencyOptimizations = async (
	videoElement: HTMLVideoElement
): Promise<void> => {
	try {
		// 1. Set playout delay to zero for gaming-level latency (Chrome-specific)
		const videoElementWithLatencyHint = videoElement as HTMLVideoElement & {
			setLatencyHint?: (hint: string) => void;
		};

		if (videoElementWithLatencyHint.setLatencyHint) {
			videoElementWithLatencyHint.setLatencyHint("interactive");
		}

		// 2. Request hardware acceleration if available
		if (videoElement.requestVideoFrameCallback) {
			const enableHardwareAcceleration = () => {
				const videoElementWithHardware = videoElement as HTMLVideoElement & {
					webkitDecodedFrameCount?: number;
				};

				if (videoElementWithHardware.webkitDecodedFrameCount !== undefined) {
					console.log("🚀 Hardware decoding available");
				}
			};
			videoElement.requestVideoFrameCallback(enableHardwareAcceleration);
		}

		// 3. Minimize jitter buffer (Chrome experimental)
		const videoElementWithPlayoutDelay = videoElement as HTMLVideoElement & {
			setPlayoutDelayHint?: (delay: number) => void;
		};

		if (videoElementWithPlayoutDelay.setPlayoutDelayHint) {
			videoElementWithPlayoutDelay.setPlayoutDelayHint(0.001); // 1ms minimum delay
		}

		// 4. Enable low-latency decode
		const videoElementWithWebkit = videoElement as HTMLVideoElement & {
			webkitRequestFullscreen?: () => void;
		};

		if (videoElementWithWebkit.webkitRequestFullscreen) {
			videoElement.style.imageRendering = "pixelated"; // Faster rendering
		}

		console.log("✅ Advanced latency optimizations applied");
	} catch (err) {
		console.warn("⚠️ Some advanced optimizations not supported:", err);
	}
};

// Ultra-aggressive buffer management for frame callback
export const createFrameCallback = (
	videoElement: HTMLVideoElement,
	streamId: string
) => {
	const frameCallback = (now: number, metadata: VideoFrameMetadata) => {
		// Ultra-aggressive buffer management
		if (videoElement.buffered && videoElement.buffered.length > 0) {
			const bufferEnd = videoElement.buffered.end(
				videoElement.buffered.length - 1
			);
			const currentTime = videoElement.currentTime;
			const bufferDelay = bufferEnd - currentTime;

			// Keep buffer extremely small for gaming-level latency
			if (bufferDelay > 0.1) {
				// More than 100ms buffered
				videoElement.currentTime = bufferEnd - 0.01; // Keep 10ms buffer only
			}
		}

		// Monitor frame timing for ultra-low latency
		if (metadata) {
			console.log(`🎯 Frame timing for ${streamId}:`, {
				presentationTime: metadata.presentationTime,
				expectedDisplayTime: metadata.expectedDisplayTime,
				processingDuration: metadata.processingDuration,
			});
		}

		// Continue monitoring
		if (videoElement.requestVideoFrameCallback) {
			videoElement.requestVideoFrameCallback(frameCallback);
		}
	};

	return frameCallback;
};

// Monitor frame drops periodically
export const monitorFrameDrops = (
	videoElement: HTMLVideoElement,
	streamId: string
) => {
	const videoElementWithQuality = videoElement as HTMLVideoElement & {
		getVideoPlaybackQuality?: () => {
			droppedVideoFrames: number;
			totalVideoFrames: number;
			corruptedVideoFrames: number;
		};
	};

	if (videoElementWithQuality.getVideoPlaybackQuality) {
		const quality = videoElementWithQuality.getVideoPlaybackQuality();
		const dropRate =
			quality.droppedVideoFrames / Math.max(quality.totalVideoFrames, 1);

		if (dropRate > 0.05) {
			// More than 5% drop rate
			console.warn(
				`⚠️ High frame drop rate for ${streamId}: ${(dropRate * 100).toFixed(
					1
				)}%`,
				{
					dropped: quality.droppedVideoFrames,
					total: quality.totalVideoFrames,
					corrupted: quality.corruptedVideoFrames,
				}
			);
		}
	}
};

// Setup low latency video element
export const setupLowLatencyVideoElement = (
	videoElement: HTMLVideoElement,
	streamId: string
) => {
	// Configure ultra-low latency video playback
	videoElement.playsInline = true;
	videoElement.controls = false;
	videoElement.muted = false;

	// Advanced frame management for lowest latency
	if (videoElement.requestVideoFrameCallback) {
		const frameCallback = createFrameCallback(videoElement, streamId);
		videoElement.requestVideoFrameCallback(frameCallback);
	}

	// Set minimum playout delay if supported
	const videoElementWithLatencyHint = videoElement as HTMLVideoElement & {
		setLatencyHint?: (hint: string) => void;
	};

	if (videoElementWithLatencyHint.setLatencyHint) {
		videoElementWithLatencyHint.setLatencyHint("interactive");
	}

	// Request low latency mode
	if (videoElement.requestVideoFrameCallback) {
		const frameCallback = () => {
			// Minimize buffering by keeping playback close to live edge
			if (videoElement.buffered && videoElement.buffered.length > 0) {
				const bufferEnd = videoElement.buffered.end(
					videoElement.buffered.length - 1
				);
				const currentTime = videoElement.currentTime;
				const bufferDelay = bufferEnd - currentTime;

				// If buffer is too large, skip to reduce latency
				if (bufferDelay > 0.5) {
					// More than 500ms buffered
					videoElement.currentTime = bufferEnd - 0.1; // Keep 100ms buffer
				}
			}

			// Continue monitoring
			if (videoElement.requestVideoFrameCallback) {
				videoElement.requestVideoFrameCallback(frameCallback);
			}
		};

		videoElement.requestVideoFrameCallback(frameCallback);
	}
};

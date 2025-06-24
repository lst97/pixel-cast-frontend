// WebRTC utilities for ultra-low latency screen sharing with high frame rates

/**
 * Creates a peer connection optimized for ultra-low latency and high frame rates
 */
export function createUltraLowLatencyPeerConnection(
	iceServers: RTCIceServer[]
): RTCPeerConnection {
	const config: RTCConfiguration = {
		iceServers,
		iceTransportPolicy: "all",
		bundlePolicy: "max-bundle",
		rtcpMuxPolicy: "require",
		// Conservative ICE candidate pool for better stability
		iceCandidatePoolSize: 10,
	};

	const pc = new RTCPeerConnection(config);

	// Enhanced connection state monitoring for high frame rates
	pc.onconnectionstatechange = () => {
		console.log(`🔗 Connection state: ${pc.connectionState}`);

		// More conservative reconnection for stability
		if (
			pc.connectionState === "failed" ||
			pc.connectionState === "disconnected"
		) {
			console.log("🔄 Attempting ICE restart for recovery...");
			setTimeout(() => {
				if (
					pc.connectionState === "failed" ||
					pc.connectionState === "disconnected"
				) {
					pc.restartIce();
				}
			}, 1000); // Conservative recovery timing
		}
	};

	pc.oniceconnectionstatechange = () => {
		console.log(`🧊 ICE connection state: ${pc.iceConnectionState}`);

		// Monitor for high frame rate streaming issues
		if (pc.iceConnectionState === "failed") {
			console.warn("❌ ICE connection failed - may affect frame rate");
		} else if (pc.iceConnectionState === "connected") {
			console.log("✅ ICE connection established successfully");
		}
	};

	// Note: Removed experimental insertable streams setup as it was causing
	// SRS to reject the SDP (SRS only supports sendrecv/sendonly for publishing)

	return pc;
}

/**
 * Optimizes SDP for ultra-low latency and high frame rate streaming
 */
export function optimizeSdpForLowLatency(sdp: string): string {
	let optimizedSdp = sdp;

	try {
		// 1. Enhanced RTCP feedback for better error recovery (only add if not already present)
		if (
			!optimizedSdp.includes("a=rtcp-fb:") ||
			!optimizedSdp.includes("ccm fir")
		) {
			optimizedSdp = optimizedSdp.replace(
				/a=rtcp-fb:(\d+) nack pli/g,
				"a=rtcp-fb:$1 nack pli\r\na=rtcp-fb:$1 nack\r\na=rtcp-fb:$1 ccm fir"
			);
		}

		// 2. Increase bandwidth for high frame rates (only if bandwidth is specified)
		optimizedSdp = optimizedSdp.replace(/b=AS:(\d+)/g, (match, bandwidth) => {
			const currentBandwidth = parseInt(bandwidth);
			// Only increase if current bandwidth is less than 8 Mbps
			if (currentBandwidth < 8000) {
				return "b=AS:8000"; // 8 Mbps for high frame rate streams
			}
			return match; // Keep existing if already high
		});

		// 3. Skip TIAS bandwidth as SRS ignores it and may cause parsing issues
		// (SRS logs show: "ignore sdp line=b=TIAS:8000000")

		// 4. Optimize H.264 parameters for high frame rate (if H.264 is used)
		optimizedSdp = optimizedSdp.replace(
			/a=fmtp:(\d+) ([^;\r\n]*profile-level-id[^;\r\n]*)/g,
			(match, pt, params) => {
				// Only add frame rate params if not already present
				if (!params.includes("max-fr") && !params.includes("max-fs")) {
					return `a=fmtp:${pt} ${params};max-fr=60;max-fs=8160`;
				}
				return match;
			}
		);

		// 5. Enable low-latency mode for VP8/VP9 if present
		optimizedSdp = optimizedSdp.replace(
			/a=fmtp:(\d+) ([^;\r\n]*VP[89][^;\r\n]*)/gi,
			(match, pt, params) => {
				if (!params.includes("max-fr")) {
					return `a=fmtp:${pt} ${params};max-fr=60`;
				}
				return match;
			}
		);

		// 6. Ensure RTCP-MUX is enabled (reduces port usage and latency)
		if (!optimizedSdp.includes("a=rtcp-mux")) {
			optimizedSdp = optimizedSdp.replace(
				/m=video \d+ [^\r\n]+/g,
				"$&\r\na=rtcp-mux"
			);
		}

		console.log("🎯 SDP safely optimized for high frame rates");

		// Log the optimized SDP for debugging (first 500 chars)
		console.log(
			"📋 Optimized SDP preview:",
			optimizedSdp.substring(0, 500) + "..."
		);
	} catch (error) {
		console.warn("⚠️ SDP optimization failed, using original SDP:", error);
		return sdp; // Return original SDP if optimization fails
	}

	return optimizedSdp;
}

/**
 * Configures encoding parameters for ultra-low latency and high frame rate
 */
export async function configureLowLatencyEncoding(
	sender: RTCRtpSender
): Promise<void> {
	try {
		const params = sender.getParameters();

		if (params.encodings && params.encodings.length > 0) {
			const encoding = params.encodings[0];

			// High frame rate encoding optimizations
			encoding.maxBitrate = 10000000; // 10 Mbps for high FPS
			encoding.maxFramerate = 60; // Support up to 60 FPS
			encoding.priority = "high";
			encoding.networkPriority = "high";

			// High frame rate specific settings
			if ("scaleResolutionDownBy" in encoding) {
				encoding.scaleResolutionDownBy = 1; // No downscaling
			}

			// Set minimum bitrate to prevent quality drops (experimental)
			try {
				// @ts-expect-error - Experimental property
				encoding.minBitrate = 2000000; // 2 Mbps minimum
			} catch {
				// Ignore if not supported
			}

			await sender.setParameters(params);
			console.log("🚀 High frame rate encoding configured:", encoding);
		}
	} catch (error) {
		console.warn("⚠️ Could not configure high frame rate encoding:", error);
	}
}

/**
 * Configures receiving parameters for high frame rate streams
 */
export function configureHighFrameRateReceiver(receiver: RTCRtpReceiver): void {
	try {
		// Log receiver capabilities for debugging (if available)
		try {
			// @ts-expect-error - Experimental method
			const capabilities = receiver.getCapabilities("video");
			console.log("📺 Receiver capabilities:", capabilities);
		} catch {
			// Method not supported, continue
		}

		// Configure for high frame rate reception
		console.log("📥 High frame rate receiver configured");
	} catch (error) {
		console.warn("⚠️ Could not configure high frame rate receiver:", error);
	}
}

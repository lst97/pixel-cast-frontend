"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Share,
	PhoneOff,
	Maximize,
	Minimize,
	Settings,
	Link,
	Users,
} from "lucide-react";
import { RemoteVideo } from "./components/RemoteVideo";
import { LocalThumbnailVideo } from "./components/LocalThumbnailVideo";
import { ParticipantsSidebar } from "./components/ParticipantsSidebar";
import {
	SRSScreenShareProps,
	Participant,
	StreamInfo,
	MediaCapabilities,
} from "./types";
import {
	createUltraLowLatencyPeerConnection,
	optimizeSdpForLowLatency,
	configureLowLatencyEncoding,
	configureHighFrameRateReceiver,
} from "./utils/webrtc";
import {
	applyAdvancedLatencyOptimizations,
	setupLowLatencyVideoElement,
	monitorFrameDrops,
} from "./utils/latencyOptimization";
import {
	RESOLUTION_OPTIONS,
	FRAME_RATE_OPTIONS,
	PRESENCE_HEARTBEAT_INTERVAL,
	MAX_WHIP_RETRIES,
	BASE_RETRY_DELAY,
} from "./constants";
import { useStreamSSE } from "./hooks/useStreamSSE";

function SRSScreenShare({ config, onDisconnect }: SRSScreenShareProps) {
	// SSE connection for real-time stream updates
	const {
		streams: sseStreams,
		isConnected: sseConnected,
		error: sseError,
	} = useStreamSSE(config.roomName);

	// State
	const [isSharing, setIsSharing] = useState(false);
	const [participants, setParticipants] = useState<Participant[]>([]);
	const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
		new Map()
	);
	const [resolution, setResolution] = useState<string>("1920x1080");
	const [frameRate, setFrameRate] = useState<number>(30);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [linkCopied, setLinkCopied] = useState(false);
	const [showParticipants, setShowParticipants] = useState(true);
	const [viewers, setViewers] = useState<Set<string>>(new Set());
	const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
	const [availableStreams, setAvailableStreams] = useState<Set<string>>(
		new Set()
	);
	const [availableStreamInfos, setAvailableStreamInfos] = useState<
		Map<string, { hasVideo: boolean; hasAudio: boolean; name: string }>
	>(new Map());

	// Refs
	const localVideoRef = useRef<HTMLVideoElement>(null);
	const publishPcRef = useRef<RTCPeerConnection | null>(null);
	const subscribePcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
	const localStreamRef = useRef<MediaStream | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const isMountedRef = useRef<boolean>(true);

	// Track previous settings to detect actual changes
	const prevSettingsRef = useRef({ resolution, frameRate });

	// Helper functions
	const getCurrentResolution = useCallback(() => {
		const [width, height] = resolution.split("x").map(Number);
		return { width, height };
	}, [resolution]);

	// Helper function to truncate room name
	const truncateRoomName = (name: string, maxLength: number = 20) => {
		return name.length > maxLength
			? `${name.substring(0, maxLength)}...`
			: name;
	};

	// Stream management
	const subscribeToStream = useCallback(
		async (streamId: string, media: MediaCapabilities) => {
			try {
				console.log(`🔔 Subscribing to stream: ${streamId} with media:`, media);

				if (!media.hasAudio && !media.hasVideo) {
					console.warn(
						`Stream ${streamId} has no audio or video tracks. Aborting subscription.`
					);
					return;
				}

				const pc = createUltraLowLatencyPeerConnection(config.iceServers);

				// Add transceivers based on available media
				if (media.hasAudio) {
					pc.addTransceiver("audio", {
						direction: "recvonly",
					});
					console.log(`📹 Added audio transceiver for ${streamId}`);
				}

				if (media.hasVideo) {
					pc.addTransceiver("video", {
						direction: "recvonly",
					});
					console.log(`📹 Added video transceiver for ${streamId}`);
				}

				// Handle received stream
				pc.ontrack = (event) => {
					console.log(`📺 Received track from ${streamId}:`, event.track.kind);
					const stream = event.streams[0];

					// Configure high frame rate receiver for video tracks
					if (event.track.kind === "video" && event.receiver) {
						configureHighFrameRateReceiver(event.receiver);
					}

					setRemoteStreams((prev) => new Map(prev.set(streamId, stream)));

					// Setup low latency video element and audio handling
					setTimeout(async () => {
						const videoElement = document.querySelector(
							`video[data-stream-id="${streamId}"]`
						) as HTMLVideoElement;

						if (videoElement) {
							if (event.track.kind === "video") {
								await applyAdvancedLatencyOptimizations(videoElement);
								setupLowLatencyVideoElement(videoElement, streamId);

								// Set up frame drop monitoring
								const monitorInterval = setInterval(() => {
									monitorFrameDrops(videoElement, streamId);
								}, 5000);

								// Cleanup interval when element is removed
								videoElement.addEventListener("loadstart", () => {
									clearInterval(monitorInterval);
								});
							} else if (event.track.kind === "audio") {
								// Audio track received - ensure video element is ready for audio
								console.log(`🔊 Audio track received for ${streamId}`);
								videoElement.muted = false;
								videoElement.volume = 1.0;

								// Monitor audio track state
								event.track.addEventListener("ended", () => {
									console.log(`🔇 Audio track ended for ${streamId}`);
								});

								event.track.addEventListener("mute", () => {
									console.log(`🔇 Audio track muted for ${streamId}`);
								});

								event.track.addEventListener("unmute", () => {
									console.log(`🔊 Audio track unmuted for ${streamId}`);
								});
							}
						}
					}, 50);

					// Add to participants only when we actually receive a track
					setParticipants((prev) => {
						const existing = prev.find((p) => p.identity === streamId);
						if (!existing) {
							return [
								...prev,
								{
									identity: streamId,
									name: streamId,
									isSharing: true,
									streamUrl: `http://localhost:1985/rtc/v1/whep/?app=${config.roomName}&stream=${streamId}`,
								},
							];
						}
						return prev.map((p) =>
							p.identity === streamId ? { ...p, isSharing: true } : p
						);
					});

					// Update available streams - only when actually subscribed
					setAvailableStreams((prev) => new Set(prev).add(streamId));

					// Auto-select first stream if none selected and this is a manual subscription
					if (!selectedStreamId) {
						setSelectedStreamId(streamId);
					}
				};

				// Connection management
				pc.onconnectionstatechange = () => {
					console.log(
						`🔗 Connection state for ${streamId}:`,
						pc.connectionState
					);
					if (pc.connectionState === "connected") {
						console.log(`✅ WHEP connection established for ${streamId}`);
					} else if (pc.connectionState === "failed") {
						console.log(`❌ WHEP connection failed for ${streamId}`);
						setTimeout(() => unsubscribeFromStream(streamId), 1000);
					} else if (pc.connectionState === "disconnected") {
						console.log(`🔌 Connection lost for ${streamId}`);
						setTimeout(() => {
							if (pc.connectionState === "disconnected") {
								unsubscribeFromStream(streamId);
							}
						}, 2000);
					}
				};

				// ICE management
				pc.onicecandidate = (event) => {
					if (event.candidate) {
						console.log(
							"📡 WHEP ICE candidate:",
							event.candidate.type,
							event.candidate.protocol
						);
					}
				};

				pc.oniceconnectionstatechange = () => {
					console.log("🧊 WHEP ICE connection state:", pc.iceConnectionState);
					if (pc.iceConnectionState === "failed") {
						pc.restartIce();
					} else if (pc.iceConnectionState === "disconnected") {
						setTimeout(() => {
							if (pc.iceConnectionState === "disconnected") {
								pc.restartIce();
							}
						}, 1000);
					}
				};

				// Create and send offer
				const offer = await pc.createOffer({
					offerToReceiveAudio: media.hasAudio,
					offerToReceiveVideo: media.hasVideo,
				});

				console.log(
					`🔊 WebRTC Offer - Requesting Audio: ${media.hasAudio}, Video: ${media.hasVideo}`
				);
				console.log(`🔊 Offer SDP Preview:`, offer.sdp?.slice(0, 500) + "...");

				if (offer.sdp) {
					offer.sdp = optimizeSdpForLowLatency(offer.sdp);
				}

				await pc.setLocalDescription(offer);

				const whepUrl = `/api/srs-proxy/whep?app=${encodeURIComponent(
					config.roomName
				)}&stream=${encodeURIComponent(streamId)}`;

				const whepResponse = await fetch(whepUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/sdp",
						"X-Prefer-Low-Latency": "true",
					},
					body: offer.sdp,
				});

				if (whepResponse.ok) {
					const answerSdp = await whepResponse.text();
					await pc.setRemoteDescription(
						new RTCSessionDescription({ type: "answer", sdp: answerSdp })
					);
					subscribePcsRef.current.set(streamId, pc);
					console.log(`✅ Successfully subscribed to ${streamId}`);
				} else {
					const errorText = await whepResponse.text();
					console.error(`❌ Failed to subscribe to ${streamId}:`, errorText);
					pc.close();
				}
			} catch (error) {
				console.error(`❌ Error subscribing to stream ${streamId}:`, error);
			}
		},
		[config.iceServers, config.roomName]
	);

	const unsubscribeFromStream = (streamId: string) => {
		console.log(`🔕 Unsubscribing from stream: ${streamId}`);

		const pc = subscribePcsRef.current.get(streamId);
		if (pc) {
			try {
				pc.getReceivers().forEach((receiver) => {
					if (receiver.track) {
						receiver.track.stop();
					}
				});
				pc.close();
			} catch (error) {
				console.warn(`⚠️ Error during unsubscribe cleanup:`, error);
			}
			subscribePcsRef.current.delete(streamId);
		}

		setRemoteStreams((prev) => {
			const newMap = new Map(prev);
			const stream = newMap.get(streamId);
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
			}
			newMap.delete(streamId);
			return newMap;
		});

		setParticipants((prev) => prev.filter((p) => p.identity !== streamId));

		// Update available streams
		setAvailableStreams((prev) => {
			const newSet = new Set(prev);
			newSet.delete(streamId);
			return newSet;
		});

		// Update selected stream if it was the one being removed
		setSelectedStreamId((prev) => {
			if (prev === streamId) {
				// We need to find another stream, but we'll do this in an effect
				// For now, just clear the selection
				return null;
			}
			return prev;
		});
	};

	// Function to manually stop viewing a specific stream
	const stopViewingStream = (streamId: string) => {
		console.log(`👁️ Stopping viewing stream: ${streamId}`);
		unsubscribeFromStream(streamId);
	};

	// Function to select which stream to watch - Discord-like behavior
	const selectStreamToWatch = async (streamId: string) => {
		console.log(`📺 Selecting stream to watch: ${streamId}`);

		// Check if we have stream info for this stream
		const streamInfo = availableStreamInfos.get(streamId);
		if (!streamInfo) {
			console.error(`No stream info found for ${streamId}`);
			return;
		}

		// If not already subscribed, subscribe now
		if (!subscribePcsRef.current.has(streamId)) {
			console.log(`🔔 Subscribing to stream: ${streamId} (user requested)`);
			await subscribeToStream(streamId, {
				hasVideo: streamInfo.hasVideo,
				hasAudio: streamInfo.hasAudio,
			});
		}

		// Set as selected stream
		setSelectedStreamId(streamId);
	};

	const startScreenShare = useCallback(async () => {
		try {
			console.log("🖥️ Starting screen share with SRS...");

			// Generate a unique stream ID for this attempt to prevent collisions
			const streamId = `${config.identity}-${Date.now()}`;
			console.log(`📡 Using unique stream ID: ${streamId}`);

			// Check for existing streams and clean them up
			try {
				const response = await fetch("/api/srs-proxy/streams");
				if (response.ok) {
					const data = await response.json();
					const existing = data.streams?.find((s: StreamInfo) =>
						s.name.startsWith(config.identity)
					);

					if (existing?.publish?.active) {
						console.log("🧹 Cleaning up existing stream...");
						await fetch(
							`/api/srs/stop?stream=${encodeURIComponent(existing.name)}`,
							{ method: "POST" }
						);
						await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait longer for cleanup
					}
				}
			} catch (error) {
				console.warn("⚠️ Could not check existing streams:", error);
			}

			const shareAudio = confirm("Share your computer's audio as well?");
			const { width, height } = getCurrentResolution();

			const constraints: MediaStreamConstraints = {
				video: {
					width: { ideal: width },
					height: { ideal: height },
					frameRate: { ideal: frameRate },
					aspectRatio: width / height,
				},
				audio: shareAudio
					? {
							echoCancellation: true,
							noiseSuppression: true,
							autoGainControl: false,
							// Audio settings optimized for WebRTC/Opus
							sampleRate: { ideal: 48000 }, // 48kHz for WebRTC standard
							channelCount: { ideal: 2 }, // Stereo audio
					  }
					: false,
			};

			const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
			localStreamRef.current = stream;

			// Debug what tracks we actually got
			console.log(`🎵 Audio requested: ${shareAudio}`);
			console.log(
				`🎬 Stream tracks received:`,
				stream.getTracks().map((track) => ({
					kind: track.kind,
					label: track.label,
					enabled: track.enabled,
					muted: track.muted,
					readyState: track.readyState,
				}))
			);

			const audioTracks = stream.getAudioTracks();
			const videoTracks = stream.getVideoTracks();
			console.log(
				`🎵 Audio tracks: ${audioTracks.length}, Video tracks: ${videoTracks.length}`
			);

			if (localVideoRef.current) {
				localVideoRef.current.srcObject = stream;
				localVideoRef.current.muted = true;
				localVideoRef.current.playsInline = true;
				await localVideoRef.current.play();
			}

			const pc = createUltraLowLatencyPeerConnection(config.iceServers);
			publishPcRef.current = pc;

			// Add tracks to peer connection
			stream.getTracks().forEach((track) => {
				console.log(`📡 Adding ${track.kind} track to peer connection:`, {
					id: track.id,
					label: track.label,
					enabled: track.enabled,
					muted: track.muted,
				});

				const transceiver = pc.addTransceiver(track, {
					direction: "sendonly",
					streams: [stream],
				});

				console.log(
					`📡 Added transceiver for ${track.kind} track, direction: ${transceiver.direction}`
				);

				// Configure encoding for video tracks
				if (track.kind === "video" && transceiver.sender) {
					setTimeout(() => {
						configureLowLatencyEncoding(transceiver.sender);
					}, 100);
				}
			});

			// Enhanced connection handlers with better timeout handling
			let connectionTimeout: NodeJS.Timeout | null = null;
			let isConnected = false;

			pc.onicecandidate = (event) => {
				if (event.candidate) {
					console.log("📡 WHIP ICE candidate:", event.candidate.type);
				}
			};

			pc.oniceconnectionstatechange = () => {
				console.log("🧊 WHIP ICE state:", pc.iceConnectionState);

				if (
					pc.iceConnectionState === "connected" ||
					pc.iceConnectionState === "completed"
				) {
					isConnected = true;
					if (connectionTimeout) {
						clearTimeout(connectionTimeout);
					}
				} else if (
					pc.iceConnectionState === "failed" ||
					pc.iceConnectionState === "disconnected"
				) {
					if (!isConnected) {
						console.log("🔄 ICE connection failed, attempting restart...");
						pc.restartIce();
					}
				}
			};

			pc.onconnectionstatechange = () => {
				console.log("🔗 WHIP Connection state:", pc.connectionState);

				if (pc.connectionState === "connected") {
					isConnected = true;
					if (connectionTimeout) {
						clearTimeout(connectionTimeout);
					}
				} else if (pc.connectionState === "failed") {
					console.error("❌ WHIP Connection failed permanently");
					setTimeout(() => {
						if (pc.connectionState === "failed") {
							stopScreenShare();
						}
					}, 1000); // Reduced timeout for faster recovery
				}
			};

			// Set a connection timeout to prevent hanging
			connectionTimeout = setTimeout(() => {
				if (!isConnected && pc.connectionState !== "connected") {
					console.error(
						"⏰ Connection timeout - DTLS handshake may have failed"
					);
					stopScreenShare();
				}
			}, 15000); // 15 second timeout for connection establishment

			// Create and send offer
			const offer = await pc.createOffer();
			if (offer.sdp) {
				offer.sdp = optimizeSdpForLowLatency(offer.sdp);
			}
			await pc.setLocalDescription(offer);

			// Send to SRS with improved retry logic using unique stream ID
			const whipUrl = `/api/srs-proxy/whip?app=${encodeURIComponent(
				config.roomName
			)}&stream=${encodeURIComponent(streamId)}`;

			let whipResponse;
			let retryCount = 0;

			while (retryCount < MAX_WHIP_RETRIES) {
				try {
					console.log(
						`📤 WHIP attempt ${
							retryCount + 1
						}/${MAX_WHIP_RETRIES} to ${whipUrl}`
					);

					whipResponse = await fetch(whipUrl, {
						method: "POST",
						headers: { "Content-Type": "application/sdp" },
						body: offer.sdp,
					});

					if (whipResponse.ok) {
						console.log("✅ WHIP request successful");
						break;
					}

					const errorText = await whipResponse.text();
					console.warn(
						`⚠️ WHIP attempt ${retryCount + 1} failed:`,
						whipResponse.status,
						errorText
					);

					if (retryCount < MAX_WHIP_RETRIES - 1) {
						retryCount++;
						const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
						console.log(`⏳ Retrying in ${delay}ms...`);
						await new Promise((resolve) => setTimeout(resolve, delay));
						continue;
					}

					throw new Error(`WHIP failed: ${whipResponse.status} - ${errorText}`);
				} catch (error) {
					console.error(`❌ WHIP attempt ${retryCount + 1} error:`, error);

					if (retryCount < MAX_WHIP_RETRIES - 1) {
						retryCount++;
						const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
						console.log(`⏳ Retrying in ${delay}ms...`);
						await new Promise((resolve) => setTimeout(resolve, delay));
						continue;
					}
					throw error;
				}
			}

			if (!whipResponse?.ok) {
				throw new Error("WHIP connection failed after all retries");
			}

			const answerSdp = await whipResponse.text();
			console.log("📥 Received SDP answer, setting remote description...");

			await pc.setRemoteDescription(
				new RTCSessionDescription({ type: "answer", sdp: answerSdp })
			);

			setIsSharing(true);

			// Handle stream end
			stream.getVideoTracks()[0].onended = () => {
				console.log("📺 Screen share ended by user");
				stopScreenShare();
			};

			console.log("✅ Screen sharing started successfully");
		} catch (error) {
			console.error("❌ Error starting screen share:", error);

			let message = "Unknown error";
			if (error instanceof Error) {
				if (error.message.includes("500")) {
					message = "Server error - try again in a moment";
				} else if (error.message.includes("NotAllowed")) {
					message = "Screen sharing permission denied";
				} else if (error.message.includes("DTLS")) {
					message = "Connection timeout - please try again";
				} else if (error.message.includes("RtcStreamBusy")) {
					message = "Stream is busy - please wait and try again";
				}
			}

			alert(`Failed to start screen sharing: ${message}`);

			// Clean up on error
			if (localStreamRef.current) {
				localStreamRef.current.getTracks().forEach((track) => track.stop());
				localStreamRef.current = null;
			}
			if (publishPcRef.current) {
				publishPcRef.current.close();
				publishPcRef.current = null;
			}
		}
	}, [
		config.roomName,
		config.identity,
		config.iceServers,
		resolution,
		frameRate,
		getCurrentResolution,
	]);

	const stopScreenShare = useCallback(() => {
		console.log("🛑 Stopping screen share...");

		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach((track) => track.stop());
		}

		if (publishPcRef.current) {
			try {
				publishPcRef.current.getSenders().forEach((sender) => {
					if (sender.track) {
						publishPcRef.current?.removeTrack(sender);
					}
				});
				publishPcRef.current.close();
			} catch (error) {
				console.warn("⚠️ Error during cleanup:", error);
			}
			publishPcRef.current = null;
		}

		if (localVideoRef.current) {
			localVideoRef.current.srcObject = null;
		}

		localStreamRef.current = null;
		setIsSharing(false);
	}, []);

	const toggleFullscreen = () => {
		if (!containerRef.current) return;

		if (!isFullscreen) {
			containerRef.current.requestFullscreen?.();
		} else {
			document.exitFullscreen?.();
		}
	};

	const copyShareableLink = async () => {
		try {
			const url = `${window.location.origin}/room/${encodeURIComponent(
				config.roomName
			)}`;
			await navigator.clipboard.writeText(url);
			setLinkCopied(true);
			setTimeout(() => setLinkCopied(false), 2000);
		} catch (error) {
			console.error("❌ Failed to copy link:", error);
		}
	};

	// Process SSE stream updates
	useEffect(() => {
		if (!isMountedRef.current) return;

		// Filter streams for this room and exclude self
		const roomStreams = sseStreams.filter((s) => s.app === config.roomName);

		const activeStreamInfos = roomStreams.filter(
			(s) => s.name !== config.identity && s.publish.active
		);

		console.log(
			`📡 Processing SSE stream update for ${config.roomName}: ${activeStreamInfos.length} active streams`
		);

		// Fetch presence data (we still need this for viewer tracking)
		const updatePresence = async () => {
			try {
				const presenceResponse = await fetch(
					`/api/srs-proxy/presence?room=${encodeURIComponent(config.roomName)}`
				);
				const presenceData = await presenceResponse.json();
				const allParticipants = new Set<string>(
					presenceData.participants || []
				);

				roomStreams.forEach((s) => allParticipants.add(s.name));

				// Update viewers
				const currentViewers = new Set<string>();
				allParticipants.forEach((participant) => {
					const isPublishing =
						activeStreamInfos.some((s) => s.name === participant) ||
						(participant === config.identity && isSharing);
					if (!isPublishing && participant !== config.identity) {
						currentViewers.add(participant);
					}
				});
				setViewers(currentViewers);
			} catch (error) {
				console.warn("⚠️ Failed to fetch presence:", error);
			}
		};

		updatePresence();

		const activeStreamNames = activeStreamInfos.map((s) => s.name);

		// Update available stream infos for discovery (WITHOUT subscribing)
		// EXCLUDE self stream - users don't need to watch their own stream
		const newAvailableStreamInfos = new Map<
			string,
			{ hasVideo: boolean; hasAudio: boolean; name: string }
		>();
		activeStreamInfos.forEach((streamInfo) => {
			// Only add streams that are NOT from the current user
			if (streamInfo.name !== config.identity) {
				console.log(`🔍 Client: Processing stream ${streamInfo.name}:`, {
					video: streamInfo.video,
					audio: streamInfo.audio,
					hasVideo: !!streamInfo.video,
					hasAudio: !!streamInfo.audio,
					publishActive: streamInfo.publish.active,
					rawStreamInfo: streamInfo, // Full object for debugging
				});

				// FALLBACK: If stream is actively publishing but video/audio are null,
				// assume it has video but be conservative about audio
				const hasVideo =
					!!streamInfo.video ||
					(streamInfo.publish.active && streamInfo.video === null);

				// For audio, assume it exists if it's explicitly detected OR if this is our own stream
				// (since we control whether we're sharing audio or not)
				const isOwnStream = streamInfo.name.includes(
					config.identity.split("-")[1]
				); // Match identity pattern
				const hasAudio =
					!!streamInfo.audio ||
					(streamInfo.publish.active && streamInfo.audio === null) || // AGGRESSIVE: Assume all active publishers have audio
					(isOwnStream && streamInfo.publish.active);

				console.log(
					`🔍 Client: After fallback logic - hasVideo: ${hasVideo}, hasAudio: ${hasAudio}, isOwnStream: ${isOwnStream}, publishActive: ${streamInfo.publish.active}`
				);

				newAvailableStreamInfos.set(streamInfo.name, {
					hasVideo,
					hasAudio,
					name: streamInfo.name,
				});
			}
		});
		setAvailableStreamInfos(newAvailableStreamInfos);

		// Unsubscribe from inactive streams
		for (const streamId of subscribePcsRef.current.keys()) {
			if (!activeStreamNames.includes(streamId)) {
				console.log(`🔕 Stream ${streamId} no longer active, unsubscribing`);
				unsubscribeFromStream(streamId);
			}
		}

		// NOTE: NO automatic subscription here - only when user explicitly clicks to view
	}, [sseStreams, config.roomName, config.identity, isSharing]);

	// Listen for fullscreen changes
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};

		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
		};
	}, []);

	// Announce presence and cleanup
	useEffect(() => {
		const announceJoin = async () => {
			try {
				await fetch(
					`/api/srs-proxy/presence?room=${encodeURIComponent(
						config.roomName
					)}&identity=${encodeURIComponent(config.identity)}`,
					{ method: "POST" }
				);
			} catch (error) {
				console.warn("⚠️ Failed to announce join:", error);
			}
		};

		announceJoin();
		const heartbeat = setInterval(announceJoin, PRESENCE_HEARTBEAT_INTERVAL);
		const subscribePcs = subscribePcsRef.current;

		return () => {
			clearInterval(heartbeat);
			fetch(
				`/api/srs-proxy/presence?room=${encodeURIComponent(
					config.roomName
				)}&identity=${encodeURIComponent(config.identity)}&action=leave`,
				{ method: "POST" }
			).catch(() => {});

			stopScreenShare();
			subscribePcs.forEach((pc) => pc.close());
			subscribePcs.clear();
		};
	}, [config.roomName, config.identity, stopScreenShare]);

	// Function to restart sharing with new settings
	const restartSharingWithNewSettings = useCallback(async () => {
		if (isSharing) {
			console.log("🔄 Restarting screen share with new settings...");
			stopScreenShare();
			// Small delay to ensure cleanup
			setTimeout(() => {
				startScreenShare();
			}, 500);
		}
	}, [isSharing, stopScreenShare, startScreenShare]);

	// Update sharing when settings change - only if actually sharing and settings changed
	useEffect(() => {
		const prevSettings = prevSettingsRef.current;
		const settingsChanged =
			prevSettings.resolution !== resolution ||
			prevSettings.frameRate !== frameRate;

		// Update ref with current settings
		prevSettingsRef.current = { resolution, frameRate };

		// Only restart if we're sharing AND settings actually changed (not initial mount)
		if (isSharing && settingsChanged) {
			console.log("📐 Settings changed while sharing, will restart...");
			restartSharingWithNewSettings();
		}
	}, [resolution, frameRate, isSharing, restartSharingWithNewSettings]);

	// Calculate participants - only count actually subscribed streams + self if sharing
	const totalSharingParticipants = availableStreams.size + (isSharing ? 1 : 0);

	// Main video content
	const getMainVideoContent = () => {
		if (isSharing) {
			return (
				<video
					ref={localVideoRef}
					autoPlay
					muted
					playsInline
					className='w-full h-full object-contain bg-black'
				/>
			);
		} else if (selectedStreamId && remoteStreams.has(selectedStreamId)) {
			const stream = remoteStreams.get(selectedStreamId);
			if (stream) {
				return (
					<div className='relative w-full h-full'>
						<RemoteVideo
							key={selectedStreamId}
							stream={stream}
							className='w-full h-full object-contain bg-black'
						/>
						{/* Stream controls overlay */}
						<div className='absolute top-16 right-4 flex flex-col gap-2'>
							{/* Stream selector */}
							{availableStreams.size > 1 && (
								<Select
									value={selectedStreamId}
									onValueChange={selectStreamToWatch}
								>
									<SelectTrigger className='w-48 bg-black/50 text-white border-white/20'>
										<SelectValue placeholder='Select stream' />
									</SelectTrigger>
									<SelectContent className='bg-black border-gray-700'>
										{Array.from(availableStreams).map((streamId) => (
											<SelectItem
												key={streamId}
												value={streamId}
												className='text-white hover:bg-gray-700 cursor-pointer'
											>
												{participants.find((p) => p.identity === streamId)
													?.name || streamId}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							{/* Stop viewing button */}
							<Button
								onClick={() => stopViewingStream(selectedStreamId)}
								variant='secondary'
								size='sm'
								className='bg-red-500/80 hover:bg-red-600 text-white border-none'
							>
								Stop Viewing
							</Button>
						</div>
					</div>
				);
			}
		} else {
			return (
				<div className='flex items-center justify-center h-full text-white'>
					<div className='text-center'>
						<div className='text-6xl mb-4'>🖥️</div>
						{availableStreamInfos.size > 0 ? (
							<>
								<h3 className='text-xl font-semibold mb-2'>
									Available Streams
								</h3>
								<p className='text-gray-400 mb-6'>
									Click to watch a stream (Discord-like behavior)
								</p>
								<div className='flex flex-col gap-3 mb-6 max-w-md'>
									{Array.from(availableStreamInfos.entries()).map(
										([streamId, streamInfo]) => (
											<div
												key={streamId}
												className='bg-black/30 rounded-lg p-4 border border-white/20'
											>
												<div className='flex items-center justify-between mb-3'>
													<div className='flex items-center gap-2'>
														<div className='w-3 h-3 bg-green-500 rounded-full animate-pulse'></div>
														<span className='text-white font-medium'>
															{streamInfo.name}
														</span>
													</div>
													<div className='flex gap-1'>
														{streamInfo.hasVideo && (
															<span className='text-xs bg-blue-500 text-white px-2 py-1 rounded'>
																VIDEO
															</span>
														)}
														{streamInfo.hasAudio && (
															<span className='text-xs bg-green-500 text-white px-2 py-1 rounded'>
																AUDIO
															</span>
														)}
													</div>
												</div>
												<Button
													onClick={() => selectStreamToWatch(streamId)}
													variant='outline'
													className='w-full bg-black/50 hover:bg-black/70 text-white border-white/20 transition-all duration-200'
													size='sm'
												>
													<span className='mr-2'>👁️</span>
													View Stream
												</Button>
											</div>
										)
									)}
								</div>
								<div className='text-sm text-gray-500 mb-4'>or</div>
							</>
						) : (
							<>
								<h3 className='text-xl font-semibold mb-2'>
									Ready to Share Your Screen
								</h3>
								<p className='text-gray-400 mb-6'>
									Click the Share Screen button to start sharing
								</p>
							</>
						)}
						<Button
							onClick={startScreenShare}
							size='lg'
							className='bg-black hover:bg-gray-800 text-white cursor-pointer'
						>
							<Share className='mr-2 h-5 w-5' />
							Share Screen
						</Button>
					</div>
				</div>
			);
		}
	};

	// Note: No auto-selection - Discord-like behavior requires explicit user action

	return (
		<div className='flex h-full gap-4 relative'>
			{/* Main content area */}
			<div className='flex-1 flex flex-col'>
				{/* Main video area */}
				<div
					ref={containerRef}
					className='flex-1 relative bg-gray-900 rounded-lg overflow-hidden'
				>
					{getMainVideoContent()}

					{/* Overlay indicators */}
					{(isSharing ||
						availableStreams.size > 0 ||
						availableStreamInfos.size > 0) && (
						<>
							{/* Screen share indicator */}
							<div className='absolute top-4 left-4 bg-black text-white px-3 py-2 rounded-lg text-sm font-medium'>
								{isSharing ? (
									<>🖥️ You are sharing your screen</>
								) : (
									<>
										📺{" "}
										{availableStreams.size > 0
											? participants.find(
													(p) => p.identity === Array.from(availableStreams)[0]
											  )?.name || Array.from(availableStreams)[0]
											: "No one is sharing"}
									</>
								)}
							</div>

							{/* Fullscreen button */}
							<div className='absolute top-4 right-4'>
								<Button
									onClick={toggleFullscreen}
									variant='secondary'
									size='sm'
									className='bg-black/50 hover:bg-black/70 text-white border-none cursor-pointer'
								>
									{isFullscreen ? (
										<Minimize className='h-4 w-4' />
									) : (
										<Maximize className='h-4 w-4' />
									)}
								</Button>
							</div>

							{/* Share Screen button in video container - only show when not sharing */}
							{!isSharing && (
								<div className='absolute bottom-4 right-4'>
									<Button
										onClick={startScreenShare}
										size='lg'
										className='bg-black hover:bg-gray-800 text-white cursor-pointer'
									>
										<Share className='mr-2 h-5 w-5' />
										Share Screen
									</Button>
								</div>
							)}

							{/* Publisher preview - Picture-in-Picture style */}
							{isSharing && localStreamRef.current && !isFullscreen && (
								<div className='absolute bottom-4 right-4 w-48 h-32 bg-black rounded-lg overflow-hidden border-2 border-white shadow-lg z-20'>
									<div className='relative w-full h-full'>
										<LocalThumbnailVideo
											stream={localStreamRef.current}
											className='w-full h-full object-cover'
										/>
										<div className='absolute top-1 left-1 bg-black text-white text-xs px-2 py-1 rounded'>
											You
										</div>
										<div className='absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1'>
											<div className='w-1.5 h-1.5 bg-white rounded-full animate-pulse'></div>
											LIVE
										</div>
									</div>
								</div>
							)}

							{/* Room info with tooltip */}
							<div
								className='absolute bottom-4 left-4 bg-black/50 text-white px-3 py-2 rounded-lg text-sm cursor-help'
								title={config.roomName}
							>
								Room: {truncateRoomName(config.roomName)} •{" "}
								{availableStreamInfos.size} available,{" "}
								{totalSharingParticipants} viewing
							</div>
						</>
					)}
				</div>

				{/* Participant thumbnails */}
				{(isSharing || availableStreams.size > 0) &&
					(isSharing
						? availableStreams.size > 0
						: availableStreams.size > 1) && (
						<div className='p-2 bg-gray-800'>
							<div className='flex space-x-2 overflow-x-auto'>
								{/* Current user thumbnail when sharing */}
								{isSharing && (
									<div className='flex-shrink-0 relative'>
										<LocalThumbnailVideo
											stream={localStreamRef.current}
											className='w-32 h-20 object-cover rounded border-2 border-white'
										/>
										<div className='absolute bottom-0 left-0 right-0 bg-black text-white text-xs px-1 py-0.5 rounded-b'>
											You
										</div>
									</div>
								)}

								{/* Remote participant thumbnails - only for available streams */}
								{Array.from(availableStreams).map((streamId) => {
									const stream = remoteStreams.get(streamId);
									const participant = participants.find(
										(p) => p.identity === streamId
									);
									return (
										<div
											key={streamId}
											className={`flex-shrink-0 relative cursor-pointer transition-all duration-200 ${
												selectedStreamId === streamId
													? "ring-2 ring-blue-500"
													: ""
											}`}
											onClick={() => selectStreamToWatch(streamId)}
										>
											{stream ? (
												<RemoteVideo
													stream={stream}
													className='w-32 h-20 object-cover rounded border-2 border-gray-500'
												/>
											) : (
												<div className='w-32 h-20 bg-black rounded border-2 border-gray-500 flex items-center justify-center'>
													<span className='text-white text-xs'>Loading...</span>
												</div>
											)}
											<div className='absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 rounded-b truncate'>
												{participant?.name || streamId}
											</div>
											{/* Stop viewing button for individual streams */}
											<button
												onClick={(e) => {
													e.stopPropagation();
													stopViewingStream(streamId);
												}}
												className='absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors'
												title='Stop viewing this stream'
											>
												×
											</button>
										</div>
									);
								})}
							</div>
						</div>
					)}

				{/* Control bar */}
				<div className='p-4'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center space-x-4'>
							{/* Participants count with toggle */}
							<Button
								variant='ghost'
								size='sm'
								onClick={() => setShowParticipants(!showParticipants)}
								className='text-black hover:text-gray-700 hover:bg-gray-100 cursor-pointer'
							>
								<Users className='h-4 w-4 mr-2' />
								<span>
									{availableStreamInfos.size} available,{" "}
									{totalSharingParticipants} viewing, {viewers.size} watching
								</span>
							</Button>

							{/* SSE Connection Status */}
							<div className='flex items-center gap-2 text-sm'>
								<div
									className={`w-2 h-2 rounded-full ${
										sseConnected
											? "bg-green-500"
											: sseError
											? "bg-red-500"
											: "bg-yellow-500"
									} ${sseConnected ? "animate-pulse" : ""}`}
								/>
								<span className='text-gray-600'>
									{sseConnected
										? "Real-time updates active"
										: sseError
										? "Connection lost"
										: "Connecting..."}
								</span>
							</div>

							{/* Shareable link button - show after joining room */}
							<Button
								onClick={copyShareableLink}
								variant='outline'
								size='sm'
								className={`border-black hover:bg-gray-100 cursor-pointer ${
									linkCopied
										? "text-green-600 border-green-600 bg-green-50"
										: "text-black"
								}`}
								title={linkCopied ? "Link copied!" : "Copy shareable link"}
							>
								<Link className='mr-2 h-4 w-4' />
								{linkCopied ? "Copied!" : "Copy Link"}
							</Button>
						</div>

						<div className='flex items-center space-x-2'>
							{/* Settings */}
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant='outline'
										size='sm'
										className='border-black text-black hover:bg-gray-100 cursor-pointer'
									>
										<Settings className='h-4 w-4' />
									</Button>
								</PopoverTrigger>
								<PopoverContent className='border-black'>
									<div className='space-y-4 p-4'>
										<div className='space-y-2'>
											<h4 className='font-medium leading-none text-black'>
												Screen Share Settings
											</h4>
											<p className='text-sm text-gray-600'>
												Configure screen sharing settings.
											</p>
										</div>
										<div className='space-y-4'>
											<div className='space-y-2'>
												<Label htmlFor='resolution' className='text-black'>
													Resolution
												</Label>
												<Select
													value={resolution}
													onValueChange={setResolution}
												>
													<SelectTrigger className='border-black cursor-pointer'>
														<SelectValue />
													</SelectTrigger>
													<SelectContent className='border-black'>
														{RESOLUTION_OPTIONS.map((option) => (
															<SelectItem
																key={option.value}
																value={option.value}
																className='text-black hover:bg-gray-100 cursor-pointer'
															>
																{option.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>

											<div className='space-y-2'>
												<Label htmlFor='framerate' className='text-black'>
													Frame Rate
												</Label>
												<Select
													value={frameRate.toString()}
													onValueChange={(value) => setFrameRate(Number(value))}
												>
													<SelectTrigger className='border-black cursor-pointer'>
														<SelectValue />
													</SelectTrigger>
													<SelectContent className='border-black'>
														{FRAME_RATE_OPTIONS.map((option) => (
															<SelectItem
																key={option.value}
																value={option.value.toString()}
																className='text-black hover:bg-gray-100 cursor-pointer'
															>
																{option.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										</div>
									</div>
								</PopoverContent>
							</Popover>

							{/* Leave room - red button */}
							<Button
								onClick={onDisconnect}
								variant='outline'
								size='sm'
								className='text-red-600 border-red-600 hover:bg-red-50 hover:border-red-700 cursor-pointer'
							>
								<PhoneOff className='mr-2 h-4 w-4' />
								Leave
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Participants sidebar - overlay on mobile, side panel on desktop */}
			{showParticipants && (
				<div className='fixed inset-0 z-40 md:relative md:inset-auto md:z-auto'>
					{/* Mobile backdrop */}
					<div
						className='absolute inset-0 bg-black/50 md:hidden'
						onClick={() => setShowParticipants(false)}
					></div>

					{/* Sidebar content */}
					<div className='absolute right-0 top-0 h-full w-full max-w-sm bg-white md:relative md:max-w-none md:bg-transparent md:w-80'>
						<div className='h-full overflow-y-auto p-4 md:p-0'>
							<ParticipantsSidebar
								setShowParticipants={setShowParticipants}
								config={config}
								isSharing={isSharing}
								participants={participants}
								viewers={viewers}
								resolution={resolution}
								frameRate={frameRate}
								publishPeerConnection={publishPcRef.current}
								subscribePeerConnections={subscribePcsRef.current}
								remoteStreams={remoteStreams}
							/>
						</div>
					</div>
				</div>
			)}

			{/* Expand button when sidebar is collapsed */}
			{!showParticipants && (
				<div className='fixed right-4 top-1/2 -translate-y-1/2 z-50'>
					<Button
						variant='outline'
						size='sm'
						onClick={() => setShowParticipants(true)}
						className='bg-white hover:bg-gray-50 border-black text-black shadow-lg cursor-pointer'
					>
						<Users className='h-4 w-4' />
					</Button>
				</div>
			)}
		</div>
	);
}

export default SRSScreenShare;
export { SRSScreenShare };

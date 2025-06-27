"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LatencyMetrics {
	rtt: number;
	jitter: number;
	packetsLost: number;
	framesDropped: number;
	totalFrames: number;
	bitrate: number;
	resolution: string;
	fps: number;
	bufferDelay: number;
	hardwareAcceleration: boolean;
}

interface RoleMetrics {
	publisher: LatencyMetrics;
	subscriber: LatencyMetrics;
}

interface LatencyMonitorProps {
	publishPeerConnection?: RTCPeerConnection | null;
	subscribePeerConnections?: Map<string, RTCPeerConnection>;
	videoElement?: HTMLVideoElement | null;
	isActive?: boolean;
	isSharing?: boolean;
}

export default function LatencyMonitor({
	publishPeerConnection,
	subscribePeerConnections,
	videoElement,
	isActive = false,
	isSharing = false,
}: LatencyMonitorProps) {
	const [metrics, setMetrics] = useState<RoleMetrics>({
		publisher: {
			rtt: 0,
			jitter: 0,
			packetsLost: 0,
			framesDropped: 0,
			totalFrames: 0,
			bitrate: 0,
			resolution: "N/A",
			fps: 0,
			bufferDelay: 0,
			hardwareAcceleration: false,
		},
		subscriber: {
			rtt: 0,
			jitter: 0,
			packetsLost: 0,
			framesDropped: 0,
			totalFrames: 0,
			bitrate: 0,
			resolution: "N/A",
			fps: 0,
			bufferDelay: 0,
			hardwareAcceleration: false,
		},
	});

	const [isMonitoring, setIsMonitoring] = useState(false);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const previousStatsRef = useRef<Map<string, any>>(new Map());
	const previousTimestampRef = useRef<number>(Date.now());

	useEffect(() => {
		if (!isActive) {
			setIsMonitoring(false);
			return;
		}

		setIsMonitoring(true);

		const interval = setInterval(async () => {
			try {
				const publisherMetrics: Partial<LatencyMetrics> = {};
				const subscriberMetrics: Partial<LatencyMetrics> = {};
				const currentTime = Date.now();
				const timeDelta = (currentTime - previousTimestampRef.current) / 1000; // seconds

				// Debug: Log what connections we have
				console.log("📊 LatencyMonitor collecting stats:", {
					isSharing,
					hasPublishPc: !!publishPeerConnection,
					hasSubscribePcs: subscribePeerConnections?.size || 0,
					hasVideoElement: !!videoElement,
				});

				// Get stats from publish peer connection (when sharing)
				if (isSharing && publishPeerConnection) {
					const stats = await publishPeerConnection.getStats();
					let hasOutboundStats = false;

					stats.forEach((report) => {
						// For outbound RTP (when we're sending)
						if (
							report.type === "outbound-rtp" &&
							report.mediaType === "video"
						) {
							hasOutboundStats = true;
							const previousReport = previousStatsRef.current.get(
								`pub_${report.id}`
							);

							if (previousReport && timeDelta > 0) {
								// Calculate bitrate from bytes sent
								const bytesDelta =
									(report.bytesSent || 0) - (previousReport.bytesSent || 0);
								publisherMetrics.bitrate = Math.round(
									(bytesDelta * 8) / (timeDelta * 1000)
								); // kbps

								// Calculate FPS from frames encoded
								const framesDelta =
									(report.framesEncoded || 0) -
									(previousReport.framesEncoded || 0);
								publisherMetrics.fps = Math.round(framesDelta / timeDelta);
							}

							publisherMetrics.totalFrames = report.framesEncoded || 0;

							// Get resolution from outbound-rtp if available
							if (report.frameWidth && report.frameHeight) {
								publisherMetrics.resolution = `${report.frameWidth}x${report.frameHeight}`;
							}

							previousStatsRef.current.set(`pub_${report.id}`, report);
						}

						// For remote inbound RTP (RTT from receiver)
						if (
							report.type === "remote-inbound-rtp" &&
							report.mediaType === "video"
						) {
							publisherMetrics.rtt = report.roundTripTime
								? report.roundTripTime * 1000
								: 0;
							publisherMetrics.packetsLost = report.packetsLost || 0;
							publisherMetrics.jitter = report.jitter
								? report.jitter * 1000
								: 0;
						}

						// Additional publisher stats from candidate-pair for RTT
						if (
							report.type === "candidate-pair" &&
							report.state === "succeeded"
						) {
							if (report.currentRoundTripTime) {
								publisherMetrics.rtt = report.currentRoundTripTime * 1000;
							}
						}

						// Get sender stats for additional metrics
						if (report.type === "media-source" && report.kind === "video") {
							if (report.width && report.height) {
								publisherMetrics.resolution = `${report.width}x${report.height}`;
							}
							if (report.framesPerSecond) {
								publisherMetrics.fps = Math.round(report.framesPerSecond);
							}
						}

						// Track stats for additional info
						if (
							report.type === "track" &&
							report.kind === "video" &&
							report.trackIdentifier
						) {
							if (report.frameWidth && report.frameHeight) {
								publisherMetrics.resolution = `${report.frameWidth}x${report.frameHeight}`;
							}
						}
					});

					// Debug log for publishers
					console.log("📤 Publisher stats collected:", {
						hasOutboundStats,
						bitrate: publisherMetrics.bitrate,
						fps: publisherMetrics.fps,
						rtt: publisherMetrics.rtt,
						resolution: publisherMetrics.resolution,
					});
				}

				// Get stats from subscribe peer connections (when watching others)
				if (subscribePeerConnections && subscribePeerConnections.size > 0) {
					// Use the first available subscribe connection
					const firstConnection = Array.from(
						subscribePeerConnections.values()
					)[0];
					if (firstConnection) {
						const stats = await firstConnection.getStats();
						let hasInboundStats = false;
						let candidatePairRtt = 0;

						stats.forEach((report) => {
							// For inbound RTP (when we're receiving)
							if (
								report.type === "inbound-rtp" &&
								report.mediaType === "video"
							) {
								hasInboundStats = true;
								const previousReport = previousStatsRef.current.get(
									`sub_${report.id}`
								);

								if (previousReport && timeDelta > 0) {
									// Calculate bitrate from bytes received
									const bytesDelta =
										(report.bytesReceived || 0) -
										(previousReport.bytesReceived || 0);
									subscriberMetrics.bitrate = Math.round(
										(bytesDelta * 8) / (timeDelta * 1000)
									); // kbps

									// Calculate FPS from frames decoded
									const framesDelta =
										(report.framesDecoded || 0) -
										(previousReport.framesDecoded || 0);
									subscriberMetrics.fps = Math.round(framesDelta / timeDelta);
								}

								subscriberMetrics.packetsLost = report.packetsLost || 0;
								subscriberMetrics.jitter = report.jitter
									? report.jitter * 1000
									: 0;
								subscriberMetrics.framesDropped = report.framesDropped || 0;
								subscriberMetrics.totalFrames = report.framesReceived || 0;

								// Get resolution from inbound-rtp if available
								if (report.frameWidth && report.frameHeight) {
									subscriberMetrics.resolution = `${report.frameWidth}x${report.frameHeight}`;
								}

								previousStatsRef.current.set(`sub_${report.id}`, report);
							}

							// For candidate-pair (RTT for subscribers)
							if (
								report.type === "candidate-pair" &&
								report.state === "succeeded"
							) {
								if (report.currentRoundTripTime) {
									candidatePairRtt = report.currentRoundTripTime * 1000;
									subscriberMetrics.rtt = candidatePairRtt;
								}
							}

							// For transport stats (additional RTT source)
							if (report.type === "transport") {
								if (report.selectedCandidatePairId) {
									// Find the corresponding candidate pair
									stats.forEach((candidateReport) => {
										if (
											candidateReport.id === report.selectedCandidatePairId &&
											candidateReport.currentRoundTripTime
										) {
											subscriberMetrics.rtt =
												candidateReport.currentRoundTripTime * 1000;
										}
									});
								}
							}
						});

						// Debug log for subscribers
						console.log("📥 Subscriber stats collected:", {
							hasInboundStats,
							candidatePairRtt,
							bitrate: subscriberMetrics.bitrate,
							fps: subscriberMetrics.fps,
							rtt: subscriberMetrics.rtt,
							resolution: subscriberMetrics.resolution,
							packetsLost: subscriberMetrics.packetsLost,
							jitter: subscriberMetrics.jitter,
						});
					}
				}

				// Get video element metrics (works for both publisher and subscriber)
				if (videoElement) {
					// Get actual video dimensions
					if (videoElement.videoWidth && videoElement.videoHeight) {
						publisherMetrics.resolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;
					}

					// Get playback quality metrics (mainly for subscribers)
					const quality = videoElement.getVideoPlaybackQuality?.();
					if (quality) {
						// Only use video element stats if we don't have WebRTC stats
						if (!publisherMetrics.framesDropped) {
							publisherMetrics.framesDropped = quality.droppedVideoFrames;
						}
						if (!publisherMetrics.totalFrames) {
							publisherMetrics.totalFrames = quality.totalVideoFrames;
						}
					}

					// Calculate buffer delay (mainly for subscribers)
					if (videoElement.buffered && videoElement.buffered.length > 0) {
						const bufferEnd = videoElement.buffered.end(
							videoElement.buffered.length - 1
						);
						const currentTime = videoElement.currentTime;
						publisherMetrics.bufferDelay = Math.max(
							0,
							Math.round((bufferEnd - currentTime) * 1000)
						);
					}

					// Check for hardware acceleration (Chrome-specific)
					try {
						// @ts-expect-error - Chrome-specific hardware acceleration detection
						if (videoElement.webkitDecodedFrameCount !== undefined) {
							publisherMetrics.hardwareAcceleration = true;
						}
					} catch {
						// Ignore errors for hardware acceleration detection
					}
				}

				// Fallback: Try to get video element if not provided (for better detection)
				if (!videoElement) {
					let fallbackVideoElement: HTMLVideoElement | null = null;

					if (isSharing) {
						// For publishers, try to find the local video element
						fallbackVideoElement = document.querySelector(
							'video[muted="true"]'
						) as HTMLVideoElement;
					} else {
						// For subscribers, try to find remote video elements
						fallbackVideoElement = document.querySelector(
							"video[autoplay]"
						) as HTMLVideoElement;
					}

					if (
						fallbackVideoElement &&
						fallbackVideoElement.videoWidth &&
						fallbackVideoElement.videoHeight
					) {
						publisherMetrics.resolution = `${fallbackVideoElement.videoWidth}x${fallbackVideoElement.videoHeight}`;

						// Get quality metrics from fallback element
						const quality = fallbackVideoElement.getVideoPlaybackQuality?.();
						if (quality && !publisherMetrics.totalFrames) {
							publisherMetrics.framesDropped = quality.droppedVideoFrames;
							publisherMetrics.totalFrames = quality.totalVideoFrames;
						}
					}
				}

				// Ensure we have reasonable default values
				if (
					!publisherMetrics.resolution ||
					publisherMetrics.resolution === "0x0"
				) {
					publisherMetrics.resolution = "N/A";
				}

				// Update timestamp for next calculation
				previousTimestampRef.current = currentTime;

				setMetrics((prev) => ({
					...prev,
					publisher: { ...prev.publisher, ...publisherMetrics },
					subscriber: { ...prev.subscriber, ...subscriberMetrics },
				}));
			} catch (error) {
				console.warn("Error collecting latency metrics:", error);
			}
		}, 1000); // Update every second

		return () => clearInterval(interval);
	}, [
		isActive,
		publishPeerConnection,
		subscribePeerConnections,
		videoElement,
		isSharing,
	]);

	const getLatencyStatus = (rtt: number) => {
		if (rtt < 30) return { label: "Gaming", color: "bg-green-600" };
		if (rtt < 100) return { label: "Interactive", color: "bg-yellow-600" };
		if (rtt < 200) return { label: "Good", color: "bg-blue-600" };
		return { label: "High", color: "bg-red-600" };
	};

	const getDropRate = (roleMetrics: LatencyMetrics) => {
		if (roleMetrics.totalFrames === 0) return "0.00";
		return (
			(roleMetrics.framesDropped / roleMetrics.totalFrames) *
			100
		).toFixed(2);
	};

	const getPacketLossRate = (roleMetrics: LatencyMetrics) => {
		if (roleMetrics.packetsLost === 0) return "0.00";
		// Estimate total packets based on bitrate and packet size
		const estimatedPackets = Math.max(roleMetrics.packetsLost + 100, 1000);
		return ((roleMetrics.packetsLost / estimatedPackets) * 100).toFixed(2);
	};

	const renderMetricsSection = (
		roleMetrics: LatencyMetrics,
		role: "Publisher" | "Subscriber"
	) => {
		const latencyStatus = getLatencyStatus(roleMetrics.rtt);
		const dropRate = getDropRate(roleMetrics);
		const packetLossRate = getPacketLossRate(roleMetrics);

		return (
			<div className='space-y-4'>
				{/* Role Header */}
				<div className='flex items-center gap-2'>
					<Badge
						variant='outline'
						className={
							role === "Publisher"
								? "border-blue-600 text-blue-600"
								: "border-purple-600 text-purple-600"
						}
					>
						{role === "Publisher" ? "📤" : "📥"} {role}
					</Badge>
				</div>

				{/* Primary Latency Metric */}
				<div className='flex items-center justify-between'>
					<span className='text-sm font-medium text-black'>
						Round Trip Time
					</span>
					<div className='flex items-center gap-2'>
						<Badge className={`${latencyStatus.color} text-white`}>
							{latencyStatus.label}
						</Badge>
						<span className='font-mono text-sm text-black'>
							{roleMetrics.rtt > 0 ? roleMetrics.rtt.toFixed(1) : "0.0"}ms
						</span>
					</div>
				</div>

				{/* Performance Metrics Grid */}
				<div className='grid grid-cols-2 gap-3 text-xs'>
					<div className='flex flex-col'>
						<span className='text-gray-600'>Jitter</span>
						<span className='font-mono text-black'>
							{roleMetrics.jitter > 0 ? roleMetrics.jitter.toFixed(1) : "0.0"}ms
						</span>
					</div>
					<div className='flex flex-col'>
						<span className='text-gray-600'>Buffer Delay</span>
						<span className='font-mono text-black'>
							{roleMetrics.bufferDelay}ms
						</span>
					</div>
					<div className='flex flex-col'>
						<span className='text-gray-600'>Frame Drop Rate</span>
						<span className='font-mono text-black'>{dropRate}%</span>
					</div>
					<div className='flex flex-col'>
						<span className='text-gray-600'>Packet Loss</span>
						<span className='font-mono text-black'>{packetLossRate}%</span>
					</div>
				</div>

				{/* Video Quality Metrics */}
				<div className='border-t border-gray-300 pt-3 space-y-2'>
					<div className='flex justify-between text-xs'>
						<span className='text-gray-600'>Resolution</span>
						<span className='font-mono text-black'>
							{roleMetrics.resolution}
						</span>
					</div>
					<div className='flex justify-between text-xs'>
						<span className='text-gray-600'>Bitrate</span>
						<span className='font-mono text-black'>
							{roleMetrics.bitrate > 0
								? `${roleMetrics.bitrate} kbps`
								: "0 kbps"}
						</span>
					</div>
					<div className='flex justify-between text-xs'>
						<span className='text-gray-600'>FPS</span>
						<span className='font-mono text-black'>
							{roleMetrics.fps > 0 ? roleMetrics.fps : "0"}
						</span>
					</div>
					<div className='flex justify-between text-xs'>
						<span className='text-gray-600'>Hardware Acceleration</span>
						<span className='font-mono text-black'>
							{roleMetrics.hardwareAcceleration ? "✅ Enabled" : "❌ Disabled"}
						</span>
					</div>
				</div>

				{/* Performance Warnings */}
				{(roleMetrics.rtt > 100 || parseFloat(dropRate) > 5) && (
					<div className='border-t border-gray-300 pt-3'>
						<div className='text-xs text-red-600 font-medium'>
							⚠️ Performance Issues Detected
						</div>
						<ul className='text-xs text-gray-600 mt-1 space-y-1'>
							{roleMetrics.rtt > 100 && (
								<li>
									• High latency detected ({roleMetrics.rtt.toFixed(1)}ms)
								</li>
							)}
							{parseFloat(dropRate) > 5 && (
								<li>• Frame drops detected ({dropRate}%)</li>
							)}
						</ul>
					</div>
				)}
			</div>
		);
	};

	// Determine which roles are active
	const hasPublisherData = isSharing && publishPeerConnection;
	const hasSubscriberData =
		subscribePeerConnections && subscribePeerConnections.size > 0;

	if (!isMonitoring) {
		return (
			<Card className='w-full max-w-md border-black bg-white'>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-black'>
						📊 Latency Monitor
						<Badge variant='outline' className='border-gray-400 text-gray-600'>
							Inactive
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-sm text-gray-600'>
						Start screen sharing to monitor latency metrics
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className='w-full max-w-md border-black bg-white'>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-black'>
					📊 Latency Monitor
					<Badge
						variant='outline'
						className='border-green-600 text-green-600 animate-pulse'
					>
						Live
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className='space-y-6'>
				{/* Publisher Section */}
				{hasPublisherData &&
					renderMetricsSection(metrics.publisher, "Publisher")}

				{/* Divider when both sections are shown */}
				{hasPublisherData && hasSubscriberData && (
					<div className='border-t border-gray-300 my-4'></div>
				)}

				{/* Subscriber Section */}
				{hasSubscriberData &&
					renderMetricsSection(metrics.subscriber, "Subscriber")}

				{/* Optimization Status - shown for any active role */}
				{(hasPublisherData || hasSubscriberData) && (
					<div className='border-t border-gray-300 pt-3'>
						<div className='text-xs text-gray-600 mb-2'>
							Optimizations Active:
						</div>
						<div className='flex flex-wrap gap-1'>
							<Badge
								variant='outline'
								className='text-xs border-black text-black'
							>
								Low Latency
							</Badge>
							<Badge
								variant='outline'
								className='text-xs border-black text-black'
							>
								Gaming Buffer
							</Badge>
							<Badge
								variant='outline'
								className='text-xs border-black text-black'
							>
								DSCP QoS
							</Badge>
							{(metrics.publisher.hardwareAcceleration ||
								metrics.subscriber.hardwareAcceleration) && (
								<Badge
									variant='outline'
									className='text-xs border-black text-black'
								>
									HW Accel
								</Badge>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

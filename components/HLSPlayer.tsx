"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { buildApiUrlWithParams, ENDPOINTS } from "@/lib/config";

interface HLSPlayerProps {
	app: string;
	stream: string;
	autoplay?: boolean;
	controls?: boolean;
	muted?: boolean;
	className?: string;
}

interface HLSStreamInfo {
	success: boolean;
	isLive: boolean;
	hlsPlaybackUrl: string;
	flvPlaybackUrl: string;
	hlsLowQualityUrl: string;
	adaptivePlaylist: Array<{
		quality: string;
		url: string;
		bitrate: number;
	}>;
}

export default function HLSPlayer({
	app,
	stream,
	autoplay = true,
	controls = true,
	muted = true,
	className = "",
}: HLSPlayerProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const playerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [streamInfo, setStreamInfo] = useState<HLSStreamInfo | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [playerStatus, setPlayerStatus] = useState<string>("Initializing");
	const [debugLogs, setDebugLogs] = useState<string[]>([]);
	const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
		null
	);
	const [isStreamLive, setIsStreamLive] = useState(true);

	const addLog = (message: string) => {
		console.log(message);
		setDebugLogs((prev) => [
			...prev.slice(-10),
			`${new Date().toLocaleTimeString()}: ${message}`,
		]);
	};

	// Callback ref to ensure we capture the video element when it's created
	const videoCallbackRef = useCallback((element: HTMLVideoElement | null) => {
		videoRef.current = element;
		// Only update state if the element actually changed
		setVideoElement((prev) => {
			if (prev !== element) {
				if (element) {
					addLog("📹 Video element created via callback ref");
				}
				return element;
			}
			return prev;
		});
	}, []);

	// Initialize the player when video element is available
	useEffect(() => {
		if (!videoElement) {
			addLog("⏳ Waiting for video element to be ready");
			return;
		}

		addLog("✅ Video element is ready, starting initialization");

		let mounted = true;
		let retryTimeout: NodeJS.Timeout;
		let initializationStarted = false;

		const handleStreamEnded = () => {
			addLog("🛑 Stream has ended or is unavailable.");
			setIsStreamLive(false);
			setError("Stream is offline.");
			setIsLoading(false);
			if (playerRef.current) {
				playerRef.current.unload();
				playerRef.current.detachMediaElement();
				playerRef.current.destroy();
				playerRef.current = null;
			}
		};

		const initializePlayer = async () => {
			// Prevent duplicate initialization
			if (initializationStarted) {
				addLog("⚠️ Initialization already in progress, skipping");
				return;
			}

			initializationStarted = true;

			try {
				setIsLoading(true);
				setError(null);
				setPlayerStatus("Fetching stream info");
				addLog("🎯 Starting player initialization");

				// Double-check video element is still available
				if (!videoRef.current) {
					throw new Error(
						"Video element became unavailable during initialization"
					);
				}

				// Fetch stream info
				const response = await fetch(
					buildApiUrlWithParams(ENDPOINTS.HLS.PLAYER, {
						app,
						stream,
					})
				);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: Failed to get stream info`);
				}

				const data: HLSStreamInfo = await response.json();
				addLog(`📊 Stream data received: isLive=${data.isLive}`);

				if (!mounted) return;

				setStreamInfo(data);
				setIsStreamLive(data.isLive);

				if (!data.isLive) {
					handleStreamEnded();
					// Retry after 5 seconds if stream is not live
					initializationStarted = false; // Reset flag for retry
					retryTimeout = setTimeout(() => {
						if (mounted) {
							initializePlayer();
						}
					}, 5000);
					return;
				}

				// Final check for video element
				setPlayerStatus("Checking video element");
				addLog("🔍 Final video element check");

				const video = videoRef.current;
				if (!video) {
					throw new Error(
						"Video element ref became null during initialization"
					);
				}

				addLog("✅ Video element confirmed ready");

				// Initialize mpegts.js player
				setPlayerStatus("Loading mpegts.js");
				addLog("📺 Loading mpegts.js");

				const mpegtsModule = await import("mpegts.js");
				const mpegts = mpegtsModule.default;

				if (!mpegts.isSupported()) {
					throw new Error("mpegts.js is not supported in this browser");
				}

				addLog("✅ mpegts.js is supported");
				addLog(`🔗 FLV URL: ${data.flvPlaybackUrl}`);

				// Create mpegts player with optimal settings for live streaming
				setPlayerStatus("Creating player");
				const player = mpegts.createPlayer(
					{
						type: "flv",
						url: data.flvPlaybackUrl,
						isLive: true,
					},
					{
						enableWorker: false,
						enableStashBuffer: false,
						stashInitialSize: 128,
						autoCleanupSourceBuffer: true,
						lazyLoad: false,
						lazyLoadMaxDuration: 3 * 60,
						lazyLoadRecoverDuration: 30,
						deferLoadAfterSourceOpen: false,
						autoCleanupMaxBackwardDuration: 3 * 60,
						autoCleanupMinBackwardDuration: 2 * 60,
						fixAudioTimestampGap: false,
						accurateSeek: false,
						seekType: "range",
						seekParamStart: "bstart",
						seekParamEnd: "bend",
						rangeLoadZeroStart: false,
						customSeekHandler: undefined,
						reuseRedirectedURL: false,
						referrerPolicy: "no-referrer-when-downgrade",
					}
				);

				if (!mounted) {
					player.destroy();
					return;
				}

				playerRef.current = player;

				// Set up event listeners
				player.on(
					"error",
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(errorType: string, errorDetail: string, errorInfo: any) => {
						addLog(`❌ mpegts.js error: ${errorType} - ${errorDetail}`);
						console.error(
							"mpegts.js error:",
							errorType,
							errorDetail,
							errorInfo
						);
						if (mounted) {
							setError(`Player Error: ${errorDetail}`);
							setIsLoading(false);
						}
					}
				);

				player.on("loading_complete", () => {
					addLog("📋 mpegts.js loading complete");
					// This can sometimes mean the stream has ended (VOD).
					if (playerRef.current && !playerRef.current.isLive) {
						handleStreamEnded();
					}
				});

				player.on("recovered_early_eof", () => {
					addLog("🔄 mpegts.js recovered from early EOF");
				});

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				player.on("media_info", (mediaInfo: any) => {
					addLog("📊 Media info received");
					console.log("Media info:", mediaInfo);
				});

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				player.on("statistics_info", (stats: any) => {
					// Only log occasionally to avoid spam
					if (Math.random() < 0.01) {
						console.log("Statistics:", stats);
					}
				});

				// Video element event listeners
				const handleVideoError = (event: Event) => {
					const videoEl = event.target as HTMLVideoElement;
					const mediaError = videoEl.error;
					if (mediaError) {
						addLog(
							`❌ Video error: Code ${mediaError.code} - ${mediaError.message}`
						);
						// Code 4 often relates to src not found or invalid.
						if (mediaError.code === 4) {
							handleStreamEnded();
						} else {
							setError(`Video Error: ${mediaError.message}`);
						}
					}
				};

				video.addEventListener("error", handleVideoError);

				video.addEventListener("loadstart", () => {
					addLog("📥 Video loadstart");
				});

				video.addEventListener("loadedmetadata", () => {
					addLog("📋 Video metadata loaded");
					if (mounted) {
						setIsLoading(false);
						setPlayerStatus("mpegts.js");
						if (autoplay) {
							video.play().catch((playError) => {
								addLog(`❌ Autoplay failed: ${playError}`);
								console.error("Autoplay failed:", playError);
							});
						}
					}
				});

				video.addEventListener("canplay", () => {
					addLog("▶️ Video can play");
				});

				video.addEventListener("playing", () => {
					addLog("▶️ Video playing");
					if (mounted) setIsPlaying(true);
				});

				video.addEventListener("pause", () => {
					addLog("⏸️ Video paused");
					if (mounted) setIsPlaying(false);
				});

				video.addEventListener("waiting", () => {
					addLog("⏳ Video waiting/buffering");
				});

				// Attach player to video element
				setPlayerStatus("Attaching player");
				addLog("🔗 Attaching player to video element");
				player.attachMediaElement(video);

				// Load the stream
				setPlayerStatus("Loading stream");
				addLog("🚀 Loading stream");
				player.load();
			} catch (err) {
				addLog(`❌ Error initializing player: ${err}`);
				console.error("Player initialization error:", err);
				initializationStarted = false; // Reset flag on error
				if (mounted) {
					setError(
						err instanceof Error ? err.message : "Failed to load stream"
					);
					setIsLoading(false);
				}
			}
		};

		// Start initialization with a small delay to ensure everything is ready
		const initTimeout = setTimeout(() => {
			if (mounted && videoElement) {
				initializePlayer();
			}
		}, 100);

		return () => {
			mounted = false;
			clearTimeout(initTimeout);
			clearTimeout(retryTimeout);

			// Cleanup player
			if (playerRef.current) {
				try {
					playerRef.current.destroy();
				} catch (e) {
					console.warn("Error destroying player:", e);
				}
				playerRef.current = null;
			}

			// Cleanup video
			if (videoElement) {
				videoElement.pause();
				videoElement.src = "";
				videoElement.load();
			}
		};
	}, [app, stream, autoplay, videoElement]);

	const handleRetry = () => {
		setError(null);
		setIsLoading(true);
		setPlayerStatus("Retrying...");
		// The useEffect hook will re-initialize the player when `videoElement` is set.
		// We trigger it by temporarily setting it to null and back.
		if (videoRef.current) {
			setVideoElement(null);
			setTimeout(() => setVideoElement(videoRef.current), 50);
		}
	};

	if (error && !streamInfo?.isLive) {
		return (
			<div
				className={`flex items-center justify-center bg-black text-white ${className}`}
			>
				<div className='text-center p-8'>
					<div className='mb-4'>
						<Badge variant='destructive'>Stream Offline</Badge>
					</div>
					<p className='text-lg font-medium mb-2'>Stream Not Live</p>
					<p className='text-sm text-gray-400 mb-4'>
						{app}/{stream}
					</p>
					<Button onClick={handleRetry} variant='outline' size='sm'>
						Refresh
					</Button>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div
				className={`flex flex-col items-center justify-center bg-black text-white ${className}`}
			>
				<div className='text-center p-8 max-w-2xl'>
					<div className='mb-4'>
						<Badge variant='destructive'>Error</Badge>
					</div>
					<p className='text-lg font-medium mb-2'>Failed to Load Stream</p>
					<p className='text-sm text-gray-400 mb-4'>{error}</p>

					<Button onClick={handleRetry} variant='outline' size='sm'>
						Try Again
					</Button>

					{debugLogs.length > 0 && (
						<details className='mt-4 text-left'>
							<summary className='cursor-pointer text-sm text-gray-400'>
								Debug Logs
							</summary>
							<div className='bg-gray-900 rounded p-2 mt-2 text-xs font-mono'>
								{debugLogs.map((log, index) => (
									<div key={index}>{log}</div>
								))}
							</div>
						</details>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className={`relative bg-black ${className}`}>
			{/* Always render the video element so the ref callback works */}
			<video
				ref={videoCallbackRef}
				className={`w-full h-full object-contain ${
					isLoading ? "opacity-0" : "opacity-100"
				}`}
				controls={controls}
				muted={muted}
				playsInline
				preload='none'
			/>

			{/* Loading overlay */}
			{isLoading && (
				<div className='absolute inset-0 flex items-center justify-center bg-black text-white'>
					<div className='text-center p-8'>
						<Spinner className='mx-auto mb-4' />
						<p className='text-lg font-medium mb-2'>Loading Stream</p>
						<p className='text-sm text-gray-400 mb-2'>
							{app}/{stream}
						</p>
						<p className='text-xs text-gray-500'>Status: {playerStatus}</p>

						{debugLogs.length > 0 && (
							<details className='mt-4 text-left'>
								<summary className='cursor-pointer text-sm text-gray-400'>
									Debug Logs
								</summary>
								<div className='bg-gray-900 rounded p-2 mt-2 text-xs font-mono max-h-32 overflow-y-auto'>
									{debugLogs.map((log, index) => (
										<div key={index}>{log}</div>
									))}
								</div>
							</details>
						)}
					</div>
				</div>
			)}

			{/* Live indicator */}
			{!isLoading && streamInfo?.isLive && (
				<div className='absolute top-4 left-4 z-10'>
					<Badge variant='destructive' className='bg-red-600'>
						● LIVE
					</Badge>
				</div>
			)}

			{/* Player type indicator */}
			{!isLoading && playerStatus && playerStatus !== "Initializing" && (
				<div className='absolute top-4 right-4 z-10'>
					<Badge variant='secondary' className='bg-black/70 text-white text-xs'>
						{playerStatus}
					</Badge>
				</div>
			)}

			{/* Playing indicator */}
			{!isLoading && isPlaying && (
				<div className='absolute bottom-4 left-4 z-10'>
					<Badge variant='secondary' className='bg-black/70 text-white'>
						Playing
					</Badge>
				</div>
			)}
		</div>
	);
}

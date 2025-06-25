"use client";

import { useEffect, useRef, useState } from "react";

export default function FLVTestPage() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const playerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
	const [status, setStatus] = useState("Initializing");
	const [error, setError] = useState<string | null>(null);
	const [logs, setLogs] = useState<string[]>([]);

	const addLog = (message: string) => {
		console.log(message);
		setLogs((prev) => [
			...prev.slice(-10),
			`${new Date().toLocaleTimeString()}: ${message}`,
		]);
	};

	useEffect(() => {
		let mounted = true;

		const initPlayer = async () => {
			try {
				setStatus("Loading mpegts.js");
				addLog("Loading mpegts.js");

				const mpegtsModule = await import("mpegts.js");
				const mpegts = mpegtsModule.default;

				if (!mpegts.isSupported()) {
					throw new Error("mpegts.js is not supported");
				}

				addLog("mpegts.js is supported");

				// Wait for video element
				setStatus("Waiting for video element");
				let video = videoRef.current;
				let attempts = 0;
				while (!video && attempts < 20 && mounted) {
					await new Promise((resolve) => setTimeout(resolve, 100));
					video = videoRef.current;
					attempts++;
				}

				if (!video) {
					throw new Error("Video element not found");
				}

				addLog("Video element found");

				// Create player
				setStatus("Creating player");
				const flvUrl =
					"http://158.179.18.186:8080/__defaultApp__/0851cf3b-b43b-4bea-8688-2efb01fa1dee.flv";

				const player = mpegts.createPlayer(
					{
						type: "flv",
						url: flvUrl,
						isLive: true,
					},
					{
						enableWorker: false,
						enableStashBuffer: false,
						autoCleanupSourceBuffer: true,
						lazyLoad: false,
						fixAudioTimestampGap: false,
						accurateSeek: false,
					}
				);

				if (!mounted) {
					player.destroy();
					return;
				}

				playerRef.current = player;

				// Set up event listeners
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				player.on(
					"error",
					(errorType: string, errorDetail: string, errorInfo: any) => {
						addLog(`Player error: ${errorType} - ${errorDetail}`);
						console.error("Player error:", errorType, errorDetail, errorInfo);
						setError(`Player Error: ${errorDetail}`);
					}
				);

				player.on("loading_complete", () => {
					addLog("Loading complete");
				});

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				player.on("media_info", (mediaInfo: any) => {
					addLog("Media info received");
					console.log("Media info:", mediaInfo);
				});

				// Video element events
				video.addEventListener("loadedmetadata", () => {
					addLog("Video metadata loaded");
					setStatus("Ready");
					video.play().catch((e) => {
						addLog(`Autoplay failed: ${e}`);
					});
				});

				video.addEventListener("playing", () => {
					addLog("Video playing");
					setStatus("Playing");
				});

				video.addEventListener("error", () => {
					const videoError = video.error;
					if (videoError) {
						addLog(`Video error: ${videoError.code} - ${videoError.message}`);
						setError(`Video Error: ${videoError.message}`);
					}
				});

				// Attach and load
				setStatus("Attaching player");
				addLog("Attaching player to video");
				player.attachMediaElement(video);

				setStatus("Loading stream");
				addLog("Loading stream");
				player.load();
			} catch (err) {
				addLog(`Error: ${err}`);
				console.error("Error:", err);
				setError(err instanceof Error ? err.message : "Unknown error");
			}
		};

		// Start with delay
		setTimeout(() => {
			if (mounted) {
				initPlayer();
			}
		}, 500);

		return () => {
			mounted = false;
			if (playerRef.current) {
				try {
					playerRef.current.destroy();
				} catch (e) {
					console.warn("Error destroying player:", e);
				}
			}
		};
	}, []);

	return (
		<div className='min-h-screen bg-black text-white p-8'>
			<div className='max-w-4xl mx-auto'>
				<h1 className='text-3xl font-bold mb-6'>FLV Player Test</h1>

				<div className='mb-4'>
					<p className='text-lg'>
						Status: <span className='text-green-400'>{status}</span>
					</p>
					{error && <p className='text-red-400'>Error: {error}</p>}
				</div>

				<div className='mb-6'>
					<video
						ref={videoRef}
						className='w-full max-w-2xl bg-gray-900'
						controls
						muted
						playsInline
						preload='none'
					/>
				</div>

				<div className='bg-gray-900 rounded p-4'>
					<h3 className='font-semibold mb-2'>Debug Logs:</h3>
					<div className='font-mono text-xs space-y-1 max-h-64 overflow-y-auto'>
						{logs.map((log, index) => (
							<div key={index}>{log}</div>
						))}
					</div>
				</div>

				<div className='mt-4 text-sm text-gray-400'>
					<p>
						Testing FLV URL:
						http://158.179.18.186:8080/__defaultApp__/0851cf3b-b43b-4bea-8688-2efb01fa1dee.flv
					</p>
				</div>
			</div>
		</div>
	);
}

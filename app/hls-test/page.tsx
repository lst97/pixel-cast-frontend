"use client";

import { useEffect, useRef, useState } from "react";

export default function HLSTestPage() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [logs, setLogs] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const addLog = (message: string) => {
		console.log(message);
		setLogs((prev) => [
			...prev,
			`${new Date().toLocaleTimeString()}: ${message}`,
		]);
	};

	useEffect(() => {
		const testHLS = async () => {
			if (!videoRef.current) return;

			const video = videoRef.current;
			const hlsUrl =
				"http://158.179.18.186:8080/__defaultApp__/249de9e9-41be-4eaf-b8a8-e57d014ea400.m3u8";

			addLog("🎯 Starting HLS test");
			addLog(`📺 HLS URL: ${hlsUrl}`);

			// Test 1: Check if native HLS is supported
			if (video.canPlayType("application/vnd.apple.mpegurl")) {
				addLog("✅ Native HLS is supported");
				video.src = hlsUrl;

				video.addEventListener("loadstart", () =>
					addLog("🔄 Native: Load started")
				);
				video.addEventListener("loadedmetadata", () => {
					addLog("📋 Native: Metadata loaded");
					setIsLoading(false);
				});
				video.addEventListener("canplay", () => addLog("✅ Native: Can play"));
				video.addEventListener("playing", () => addLog("▶️ Native: Playing"));
				video.addEventListener("error", (e) => addLog(`❌ Native: Error ${e}`));

				return;
			}

			// Test 2: Try HLS.js
			try {
				addLog("📦 Loading HLS.js...");
				const HlsModule = await import("hls.js");
				const Hls = HlsModule.default;

				if (Hls.isSupported()) {
					addLog("✅ HLS.js is supported");

					const hls = new Hls({
						debug: true,
						enableWorker: false,
					});

					hls.on(Hls.Events.MEDIA_ATTACHED, () =>
						addLog("📎 HLS.js: Media attached")
					);
					hls.on(Hls.Events.MANIFEST_LOADED, () =>
						addLog("📋 HLS.js: Manifest loaded")
					);
					hls.on(Hls.Events.MANIFEST_PARSED, () => {
						addLog("📋 HLS.js: Manifest parsed");
						setIsLoading(false);
					});
					hls.on(Hls.Events.ERROR, (_event, data) => {
						addLog(`❌ HLS.js: Error ${data.type} - ${data.details}`);
					});

					video.addEventListener("loadstart", () =>
						addLog("🔄 HLS.js: Load started")
					);
					video.addEventListener("loadedmetadata", () =>
						addLog("📋 HLS.js: Metadata loaded")
					);
					video.addEventListener("canplay", () =>
						addLog("✅ HLS.js: Can play")
					);
					video.addEventListener("playing", () => addLog("▶️ HLS.js: Playing"));

					hls.loadSource(hlsUrl);
					hls.attachMedia(video);
				} else {
					addLog("❌ HLS.js not supported");
				}
			} catch (error) {
				addLog(`❌ HLS.js import error: ${error}`);
			}
		};

		testHLS();
	}, []);

	return (
		<div className='min-h-screen bg-gray-900 text-white p-8'>
			<h1 className='text-3xl font-bold mb-8'>HLS Player Debug</h1>

			<div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
				<div>
					<h2 className='text-xl font-semibold mb-4'>Video Player</h2>
					<div className='bg-black aspect-video rounded-lg overflow-hidden'>
						{isLoading && (
							<div className='flex items-center justify-center h-full'>
								<div className='text-center'>
									<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4'></div>
									<p>Loading HLS Stream...</p>
								</div>
							</div>
						)}
						<video
							ref={videoRef}
							className='w-full h-full object-contain'
							controls
							muted
							autoPlay
							playsInline
						/>
					</div>

					<div className='mt-4 space-y-2'>
						<button
							onClick={() => videoRef.current?.play()}
							className='bg-green-600 hover:bg-green-700 px-4 py-2 rounded mr-2'
						>
							Play
						</button>
						<button
							onClick={() => videoRef.current?.pause()}
							className='bg-red-600 hover:bg-red-700 px-4 py-2 rounded mr-2'
						>
							Pause
						</button>
						<button
							onClick={() => window.location.reload()}
							className='bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded'
						>
							Reload
						</button>
					</div>
				</div>

				<div>
					<h2 className='text-xl font-semibold mb-4'>Debug Logs</h2>
					<div className='bg-gray-800 rounded-lg p-4 h-96 overflow-y-auto'>
						{logs.map((log, index) => (
							<div key={index} className='text-sm font-mono mb-1'>
								{log}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

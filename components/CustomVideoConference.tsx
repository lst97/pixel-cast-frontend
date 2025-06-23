"use client";

import { ParticipantTile, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { CustomControlBar } from "./CustomControlBar";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export function CustomVideoConference() {
	const [isFullscreen, setIsFullscreen] = useState(false);
	const screenShareRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

	// Get all video and audio tracks
	const tracks = useTracks(
		[
			{ source: Track.Source.Camera, withPlaceholder: true },
			{ source: Track.Source.ScreenShare, withPlaceholder: false },
		],
		{ onlySubscribed: false }
	);

	// Separate screen share tracks from camera tracks
	const screenShareTracks = tracks.filter(
		(track) => track.source === Track.Source.ScreenShare
	);
	const cameraTracks = tracks.filter(
		(track) => track.source === Track.Source.Camera
	);

	// Calculate grid layout based on number of camera tracks
	const getGridLayout = (count: number) => {
		if (count === 1) return "grid-cols-1";
		if (count === 2) return "grid-cols-2";
		if (count <= 4) return "grid-cols-2 grid-rows-2";
		if (count <= 6) return "grid-cols-3 grid-rows-2";
		if (count <= 9) return "grid-cols-3 grid-rows-3";
		return "grid-cols-4"; // For more than 9 participants
	};

	const toggleFullscreen = (participantKey: string) => {
		const element = screenShareRefs.current[participantKey];
		if (!element) return;

		if (!isFullscreen) {
			// Enter fullscreen for the specific screen share element
			if (element.requestFullscreen) {
				element.requestFullscreen();
			}
		} else {
			// Exit fullscreen
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		}
	};

	// Listen for fullscreen changes to update state
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};

		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
		};
	}, []);

	return (
		<div className='flex flex-col h-full'>
			{/* Main video area */}
			<div className='flex-1 relative bg-gray-900 rounded-lg overflow-hidden'>
				{tracks.length === 0 ? (
					<div className='flex items-center justify-center h-full text-white'>
						<div className='text-center'>
							<div className='text-6xl mb-4'>👥</div>
							<h3 className='text-xl font-semibold mb-2'>No video streams</h3>
							<p className='text-gray-400'>
								Enable your camera or wait for others to join
							</p>
						</div>
					</div>
				) : (
					<div className='flex flex-col h-full'>
						{/* Screen share area (if any) */}
						{screenShareTracks.length > 0 && (
							<div className='flex-1 p-2 relative'>
								{screenShareTracks.map((track) => {
									const participantKey =
										track.participant.identity + track.source;
									return (
										<div
											key={participantKey}
											ref={(el) => {
												screenShareRefs.current[participantKey] = el;
											}}
											className='relative bg-gray-800 rounded-lg overflow-hidden h-full'
										>
											<ParticipantTile
												trackRef={track}
												className='w-full h-full'
											/>
											{/* Screen share indicator */}
											<div className='absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-sm'>
												🖥️{" "}
												{track.participant.name || track.participant.identity}{" "}
												is sharing
											</div>
											{/* Fullscreen button for screen share */}
											<div className='absolute top-2 right-2'>
												<Button
													onClick={() => toggleFullscreen(participantKey)}
													variant='secondary'
													size='sm'
													className='bg-black/50 hover:bg-black/70 text-white border-none'
												>
													{isFullscreen ? (
														<Minimize className='h-4 w-4' />
													) : (
														<Maximize className='h-4 w-4' />
													)}
												</Button>
											</div>
										</div>
									);
								})}
							</div>
						)}

						{/* Camera participants area */}
						{cameraTracks.length > 0 && (
							<div
								className={`${
									screenShareTracks.length > 0 ? "h-32" : "flex-1"
								} p-2`}
							>
								<div
									className={`grid gap-2 h-full ${getGridLayout(
										cameraTracks.length
									)}`}
								>
									{cameraTracks.map((track) => (
										<div
											key={track.participant.identity + track.source}
											className='relative bg-gray-800 rounded-lg overflow-hidden min-h-[120px]'
										>
											<ParticipantTile
												trackRef={track}
												className='w-full h-full'
											/>
											{/* Removed custom name overlay - using LiveKit's built-in one */}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Custom control bar at the bottom */}
			<div className='p-4'>
				<CustomControlBar />
			</div>
		</div>
	);
}

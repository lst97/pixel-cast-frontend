"use client";

import React, { useRef, useEffect } from "react";

interface RemoteVideoProps {
	stream: MediaStream;
	className: string;
}

// Separate component for remote videos to avoid React conflicts
export const RemoteVideo: React.FC<RemoteVideoProps> = ({
	stream,
	className,
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (videoRef.current && stream) {
			videoRef.current.srcObject = stream;

			// Log stream info for debugging
			const audioTracks = stream.getAudioTracks();
			const videoTracks = stream.getVideoTracks();

			console.log(`📺 RemoteVideo setup - Stream ID: ${stream.id}`);
			console.log(`🔊 Audio tracks: ${audioTracks.length}`);
			console.log(`📹 Video tracks: ${videoTracks.length}`);

			audioTracks.forEach((track, index) => {
				console.log(
					`🔊 Audio track ${index}: enabled=${track.enabled}, readyState=${track.readyState}, label=${track.label}`
				);
			});

			// Force autoplay immediately without user interaction
			const playVideo = async () => {
				try {
					// Set properties before playing - CRITICAL: Keep audio unmuted
					videoRef.current!.muted = false;
					videoRef.current!.playsInline = true;
					videoRef.current!.autoplay = true;
					videoRef.current!.volume = 1.0; // Ensure full volume

					await videoRef.current!.play();
					console.log("📺 Remote video playing automatically with audio");
				} catch (error) {
					console.warn("⚠️ Could not autoplay remote video with audio:", error);
					// For debugging - try to play with audio first, then fallback
					console.log("🔧 Attempting to play with audio controls enabled...");

					// Add temporary controls to allow user to manually unmute
					videoRef.current!.controls = true;
					videoRef.current!.muted = false;

					try {
						await videoRef.current!.play();
						console.log(
							"📺 Remote video playing with controls (audio enabled)"
						);

						// Remove controls after a few seconds
						setTimeout(() => {
							if (videoRef.current) {
								videoRef.current.controls = false;
							}
						}, 3000);
					} catch (controlsError) {
						console.error(
							"❌ Could not start remote video playback with controls:",
							controlsError
						);
					}
				}
			};

			playVideo();
		}
	}, [stream]);

	return (
		<video
			ref={videoRef}
			autoPlay
			playsInline
			muted={false}
			className={className}
			onLoadedData={() => console.log("📺 Remote video loaded")}
			onError={(e) => console.error("❌ Remote video error:", e)}
		/>
	);
};

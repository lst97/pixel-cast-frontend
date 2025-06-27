"use client";

import React, { useRef, useEffect } from "react";

interface LocalThumbnailVideoProps {
	stream: MediaStream | null;
	className: string;
}

// Separate component for local thumbnail video
export const LocalThumbnailVideo: React.FC<LocalThumbnailVideoProps> = ({
	stream,
	className,
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (videoRef.current && stream) {
			videoRef.current.srcObject = stream;

			// Force the video to play
			videoRef.current.play().catch((error) => {
				console.warn("⚠️ Could not start local thumbnail playback:", error);
			});
		}
	}, [stream]);

	return (
		<video
			ref={videoRef}
			autoPlay
			muted
			playsInline
			className={className}
			onLoadedData={() => console.log("📺 Local thumbnail loaded")}
			onError={(e) => console.error("❌ Local thumbnail error:", e)}
		/>
	);
};

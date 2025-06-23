"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Expand, Shrink } from "lucide-react";

export function CustomFullscreenButton() {
	const [isFullscreen, setIsFullscreen] = useState(false);

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
		};
	}, []);

	const toggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen();
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		}
	};

	return (
		<Button onClick={toggleFullscreen} variant='outline'>
			{isFullscreen ? (
				<Shrink className='h-4 w-4' />
			) : (
				<Expand className='h-4 w-4' />
			)}
		</Button>
	);
}

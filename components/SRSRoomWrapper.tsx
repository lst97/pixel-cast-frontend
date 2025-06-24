"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SRSScreenShare } from "@/components/SRSScreenShare";

interface SRSRoomWrapperProps {
	roomName: string;
	username: string;
	displayName?: string;
}

interface SRSConfig {
	streamKey: string;
	whipUrl: string;
	whepUrl: string;
	hlsUrl: string;
	roomName: string;
	identity: string;
	name: string;
	iceServers: RTCIceServer[];
}

export default function SRSRoomWrapper({
	roomName,
	username,
	displayName,
}: SRSRoomWrapperProps) {
	const [srsConfig, setSrsConfig] = useState<SRSConfig | null>(null);
	const [error, setError] = useState("");
	const [connectionAttempts, setConnectionAttempts] = useState(0);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		const fetchRoomConfig = async () => {
			try {
				setError(""); // Clear previous errors
				console.log(
					`🔑 Fetching SRS config for room: ${roomName}, user: ${username} (${
						displayName || "No display name"
					})`
				);

				// Build the URL with displayName if provided
				const params = new URLSearchParams({
					roomName: roomName,
					identity: username,
				});

				if (displayName) {
					params.set("name", displayName);
				}

				const response = await fetch(`/api/token?${params.toString()}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(
						errorData.error ||
							`HTTP ${response.status}: Failed to fetch room config`
					);
				}

				const data: SRSConfig = await response.json();
				console.log("✅ SRS Config received successfully:", data);
				setSrsConfig(data);
				setConnectionAttempts((prev) => prev + 1);
				setIsConnected(true);
			} catch (err) {
				console.error("❌ Error fetching SRS config:", err);
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error occurred";
				setError(
					`Failed to connect to room: ${errorMessage}. Please try again.`
				);
			}
		};

		fetchRoomConfig();
	}, [roomName, username, displayName]);

	const handleRetry = () => {
		setError("");
		setSrsConfig(null);
		setConnectionAttempts(0);
		setIsConnected(false);
		// This will trigger the useEffect to fetch room config again
		window.location.reload();
	};

	const handleDisconnect = () => {
		setIsConnected(false);
		setSrsConfig(null);
		window.location.href = "/";
	};

	if (error) {
		return (
			<div className='flex items-center justify-center min-h-[calc(100vh-200px)]'>
				<div className='text-center max-w-md'>
					<p className='text-red-500 mb-4'>{error}</p>
					<p className='text-sm text-gray-600 mb-4'>
						Connection attempts: {connectionAttempts}
					</p>
					<div className='space-x-2'>
						<Button onClick={handleRetry}>Try Again</Button>
						<Button
							variant='outline'
							onClick={() => (window.location.href = "/")}
						>
							Go Home
						</Button>
					</div>
				</div>
			</div>
		);
	}

	if (!srsConfig || !isConnected) {
		return (
			<div className='flex items-center justify-center min-h-[calc(100vh-200px)]'>
				<div className='text-center'>
					<Spinner className='mx-auto mb-4 text-primary' />
					<p>Connecting to room...</p>
					{connectionAttempts > 0 && (
						<p className='text-sm text-gray-600 mt-2'>
							Attempt {connectionAttempts}
						</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className='h-[calc(100vh-200px)]'>
			<SRSScreenShare config={srsConfig} onDisconnect={handleDisconnect} />
		</div>
	);
}

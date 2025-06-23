"use client";

import { useState, useEffect, useMemo } from "react";
import { LiveKitRoom, useRoomContext } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CustomVideoConference } from "./CustomVideoConference";
import "@livekit/components-styles";
import { ExternalE2EEKeyProvider, RoomOptions } from "livekit-client";

interface LiveKitRoomWrapperProps {
	roomName: string;
	username: string;
}

export default function LiveKitRoomWrapper({
	roomName,
	username,
}: LiveKitRoomWrapperProps) {
	const [token, setToken] = useState("");
	const [error, setError] = useState("");
	const [roomOptions, setRoomOptions] = useState<RoomOptions | null>(null);
	const [connectionAttempts, setConnectionAttempts] = useState(0);

	// E2EE key provider
	const keyProvider = useMemo(() => new ExternalE2EEKeyProvider(), []);
	const e2eeKey = process.env.NEXT_PUBLIC_E2EE_KEY!;

	// Initialize room options with enhanced WebRTC configuration
	useEffect(() => {
		if (typeof window !== "undefined") {
			const options: RoomOptions = {
				e2ee: {
					keyProvider,
					worker: new Worker(
						new URL("livekit-client/e2ee-worker", import.meta.url)
					),
				},
				publishDefaults: {
					simulcast: false,
				},
				// Connection timeout and retry settings
				disconnectOnPageLeave: true,
				reconnectPolicy: {
					nextRetryDelayInMs: (context) => {
						console.log(`🔄 Reconnection attempt ${context.retryCount + 1}`);
						return Math.min(1000 * Math.pow(2, context.retryCount), 30000);
					},
				},
			};
			setRoomOptions(options);
		}
	}, [keyProvider]);

	useEffect(() => {
		const fetchToken = async () => {
			try {
				setError(""); // Clear previous errors
				console.log(
					`🔑 Fetching token for room: ${roomName}, user: ${username}`
				);

				const response = await fetch("/api/token", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						roomName,
						identity: username,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(
						errorData.error || `HTTP ${response.status}: Failed to fetch token`
					);
				}

				// Set the key before connecting
				console.log("🔑 Setting E2EE key:", e2eeKey);
				await keyProvider.setKey(e2eeKey);

				const data = await response.json();
				console.log("✅ Token received successfully");
				setToken(data.token);
				setConnectionAttempts((prev) => prev + 1);
			} catch (err) {
				console.error("❌ Error fetching token:", err);
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error occurred";
				setError(
					`Failed to connect to room: ${errorMessage}. Please try again.`
				);
			}
		};

		fetchToken();
	}, [roomName, username, keyProvider, e2eeKey]);

	const handleRetry = () => {
		setError("");
		setToken("");
		setConnectionAttempts(0);
		// This will trigger the useEffect to fetch token again
		window.location.reload();
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

	if (!token || !roomOptions) {
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
		<div data-lk-theme='default' className='h-[calc(100vh-200px)]'>
			<LiveKitRoom
				serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
				token={token}
				connect={true}
				video={false}
				audio={false}
				options={roomOptions}
				onConnected={() => {
					console.log("✅ Successfully connected to LiveKit room");
				}}
				onDisconnected={(reason) => {
					console.log("❌ Disconnected from LiveKit room:", reason);
					if (reason) {
						setError(`Connection lost. The page will reload to reconnect.`);
						setTimeout(() => window.location.reload(), 3000);
					}
				}}
				onError={(error) => {
					console.error("🚨 LiveKit room error:", error);
					setError(
						`Room error: ${error.message || "Unknown connection error"}`
					);
				}}
			>
				<E2EEHandler />
				<AudioContextHandler />
				<CustomVideoConference />
			</LiveKitRoom>
		</div>
	);
}

// Component to handle E2EE activation
function E2EEHandler() {
	const room = useRoomContext();
	useEffect(() => {
		room
			.setE2EEEnabled(true)
			.then(() => {
				console.log("✅ E2EE enabled for all local tracks");
			})
			.catch((error) => {
				console.warn("⚠️ E2EE setup failed:", error);
			});
	}, [room]);
	return null;
}

// Component to handle AudioContext initialization - since user already interacted, we can create it immediately
function AudioContextHandler() {
	useEffect(() => {
		// Since this component only renders after user interaction, we can safely create AudioContext
		if (typeof window !== "undefined" && window.AudioContext) {
			try {
				const audioContext = new window.AudioContext();
				if (audioContext.state === "suspended") {
					audioContext.resume().catch(() => {
						// Silently handle errors
					});
				}
				// Keep the context alive for LiveKit to use
			} catch {
				// Silently handle errors
			}
		}
	}, []);

	return null; // This component doesn't render anything
}

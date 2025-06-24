import { useEffect, useRef, useState, useCallback } from "react";
import { StreamInfo } from "../types";

interface SSEMessage {
	type: "connected" | "streams_update" | "heartbeat";
	clientId?: string;
	roomName?: string;
	streams?: StreamInfo[];
}

interface UseStreamSSEResult {
	streams: StreamInfo[];
	isConnected: boolean;
	error: string | null;
	reconnect: () => void;
}

export function useStreamSSE(roomName: string): UseStreamSSEResult {
	const [streams, setStreams] = useState<StreamInfo[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isMountedRef = useRef(true);

	const cleanup = useCallback(() => {
		if (eventSourceRef.current) {
			console.log(`🧹 Cleaning up EventSource for room: ${roomName}`);
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
		setIsConnected(false);
	}, [roomName]);

	const connect = useCallback(() => {
		if (!isMountedRef.current || !roomName) {
			console.log(
				`❌ Cannot connect - mounted: ${isMountedRef.current}, roomName: "${roomName}"`
			);
			return;
		}

		cleanup();

		const sseUrl = `/api/srs-proxy/streams/sse?room=${encodeURIComponent(
			roomName
		)}`;
		console.log(`🔗 Connecting to SSE for room: ${roomName} at URL: ${sseUrl}`);

		const eventSource = new EventSource(sseUrl);
		eventSourceRef.current = eventSource;

		console.log(
			`📊 EventSource readyState: ${eventSource.readyState} (0=CONNECTING, 1=OPEN, 2=CLOSED)`
		);

		eventSource.onopen = (event) => {
			console.log(`✅ SSE connection opened for room: ${roomName}`, event);
			console.log(
				`📊 EventSource readyState after open: ${eventSource.readyState}`
			);
			setIsConnected(true);
			setError(null);
		};

		eventSource.onmessage = (event) => {
			console.log(`📨 SSE message received for room ${roomName}:`, event.data);
			try {
				const message: SSEMessage = JSON.parse(event.data);

				switch (message.type) {
					case "connected":
						console.log(`🔗 SSE connected with ID: ${message.clientId}`);
						break;

					case "streams_update":
						if (message.roomName === roomName && message.streams) {
							console.log(
								`📡 Received stream update for ${roomName}:`,
								message.streams
							);
							// Debug: Log what each stream contains
							message.streams.forEach((stream: StreamInfo, index: number) => {
								console.log(
									`🔍 Client SSE: Stream ${index} (${stream.name}):`,
									{
										video: stream.video,
										audio: stream.audio,
										publish: stream.publish,
									}
								);
							});
							setStreams(message.streams);
						} else {
							console.log(
								`🔍 Stream update for different room: ${message.roomName} (expected: ${roomName})`
							);
						}
						break;

					case "heartbeat":
						console.log(`💓 Heartbeat received for room: ${roomName}`);
						break;

					default:
						console.warn("Unknown SSE message type:", message.type);
				}
			} catch (parseError) {
				console.error(
					"Failed to parse SSE message:",
					parseError,
					"Raw data:",
					event.data
				);
			}
		};

		eventSource.onerror = (err) => {
			console.error(`❌ SSE connection error for room ${roomName}:`, err);
			console.log(
				`📊 EventSource readyState after error: ${eventSource.readyState}`
			);
			setError("Connection lost");
			setIsConnected(false);

			// Auto-reconnect after 3 seconds
			if (isMountedRef.current) {
				console.log(
					`⏰ Scheduling reconnect for room ${roomName} in 3 seconds`
				);
				reconnectTimeoutRef.current = setTimeout(() => {
					if (isMountedRef.current) {
						console.log(`🔄 Attempting to reconnect SSE for room: ${roomName}`);
						connect();
					}
				}, 3000);
			}
		};

		// Log state changes
		const checkReadyState = () => {
			const state = eventSource.readyState;
			const stateNames = ["CONNECTING", "OPEN", "CLOSED"];
			console.log(
				`📊 EventSource state for ${roomName}: ${state} (${stateNames[state]})`
			);
		};

		setTimeout(checkReadyState, 100);
		setTimeout(checkReadyState, 1000);
		setTimeout(checkReadyState, 3000);
	}, [roomName, cleanup]);

	const reconnect = useCallback(() => {
		console.log(`🔄 Manual reconnect requested for room: ${roomName}`);
		connect();
	}, [connect, roomName]);

	// Connect on mount and roomName changes
	useEffect(() => {
		// Reset mounted state when effect runs (not in cleanup)
		isMountedRef.current = true;

		if (roomName) {
			console.log(`🚀 useStreamSSE effect triggered for room: ${roomName}`);
			connect();
		}

		return () => {
			console.log(`🛑 useStreamSSE cleanup for room: ${roomName}`);
			cleanup(); // Don't set mounted to false here, only cleanup connections
		};
	}, [connect, cleanup, roomName]);

	// Only set mounted to false on actual component unmount
	useEffect(() => {
		isMountedRef.current = true; // Set to true on mount

		return () => {
			console.log(`🛑 useStreamSSE component unmounting`);
			isMountedRef.current = false;
		};
	}, []); // Empty dependency array - only runs on mount/unmount

	return {
		streams,
		isConnected,
		error,
		reconnect,
	};
}

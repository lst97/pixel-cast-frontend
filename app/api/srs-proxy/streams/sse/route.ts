import { NextRequest } from "next/server";

interface StreamInfo {
	id: string;
	app: string;
	name: string;
	publish: {
		active: boolean;
		cid?: string;
	};
	video?: {
		codec: string;
		profile?: string;
		level?: string;
		width?: number;
		height?: number;
	};
	audio?: {
		codec: string;
		sample_rate?: number;
		channel?: number;
		profile?: string;
	};
	// Additional fields that SRS might include
	vhost?: string;
	tcUrl?: string;
	url?: string;
	live_ms?: number;
	clients?: number;
	frames?: number;
	send_bytes?: number;
	recv_bytes?: number;
	kbps?: {
		recv_30s?: number;
		send_30s?: number;
	};
}

interface SRSStreamsResponse {
	streams?: StreamInfo[];
}

// Global state to track connected clients and current streams
interface StreamController {
	enqueue: (data: string) => void;
}

const connectedClients = new Map<string, StreamController>();
const currentStreams = new Map<string, StreamInfo[]>(); // roomName -> streams[]

// Cleanup disconnected clients
setInterval(() => {
	for (const [clientId, controller] of connectedClients.entries()) {
		try {
			// Try to enqueue a heartbeat to test if connection is alive
			controller.enqueue(`data: {"type":"heartbeat"}\n\n`);
		} catch {
			// Client disconnected, remove from map
			console.log(`🧹 Removing disconnected client: ${clientId}`);
			connectedClients.delete(clientId);
		}
	}
}, 30000); // Check every 30 seconds

// Poll SRS for stream changes and broadcast to clients
async function pollAndBroadcastStreams() {
	try {
		const srsResponse = await fetch("http://localhost:1985/api/v1/streams/", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!srsResponse.ok) {
			console.error(`❌ SRS streams polling failed: ${srsResponse.status}`);
			return;
		}

		const streamsData: SRSStreamsResponse = await srsResponse.json();
		const allStreams = streamsData.streams || [];

		// Debug logging for stream data
		if (allStreams.length > 0) {
			console.log(`🔍 SSE: Found ${allStreams.length} total streams`);
			allStreams.forEach((stream) => {
				console.log(
					`🔍 SSE: Stream ${stream.name} - Video: ${
						stream.video ? "YES" : "NO"
					}, Audio: ${stream.audio ? "YES" : "NO"}`
				);
				console.log(`🔍 SSE: Full stream object for ${stream.name}:`, stream);
			});
		}

		// Group streams by room (app)
		const streamsByRoom = new Map<string, StreamInfo[]>();
		allStreams.forEach((stream) => {
			if (!streamsByRoom.has(stream.app)) {
				streamsByRoom.set(stream.app, []);
			}
			streamsByRoom.get(stream.app)!.push(stream);
		});

		// Check for changes in each room and broadcast updates
		for (const [roomName, streams] of streamsByRoom.entries()) {
			const previousStreams = currentStreams.get(roomName) || [];

			// Check if streams have changed
			const hasChanged =
				streams.length !== previousStreams.length ||
				streams.some((stream, index) => {
					const prevStream = previousStreams[index];
					return (
						!prevStream ||
						stream.name !== prevStream.name ||
						stream.publish.active !== prevStream.publish.active
					);
				});

			if (hasChanged) {
				console.log(`📡 Broadcasting stream update for room: ${roomName}`);
				currentStreams.set(roomName, streams);

				// Debug what we're about to send
				console.log(
					`🔍 SSE: About to broadcast streams for ${roomName}:`,
					streams
				);

				// Broadcast to all connected clients
				const message = `data: ${JSON.stringify({
					type: "streams_update",
					roomName,
					streams,
				})}\n\n`;

				for (const [clientId, controller] of connectedClients.entries()) {
					try {
						controller.enqueue(message);
					} catch (error) {
						console.warn(`⚠️ Failed to send to client ${clientId}:`, error);
						connectedClients.delete(clientId);
					}
				}
			}
		}

		// Check for rooms that no longer have streams
		for (const [roomName] of currentStreams.entries()) {
			if (!streamsByRoom.has(roomName)) {
				console.log(`📡 Broadcasting stream removal for room: ${roomName}`);
				currentStreams.delete(roomName);

				const message = `data: ${JSON.stringify({
					type: "streams_update",
					roomName,
					streams: [],
				})}\n\n`;

				for (const [clientId, controller] of connectedClients.entries()) {
					try {
						controller.enqueue(message);
					} catch (error) {
						console.warn(`⚠️ Failed to send to client ${clientId}:`, error);
						connectedClients.delete(clientId);
					}
				}
			}
		}
	} catch (error) {
		console.error("❌ Error polling streams for SSE:", error);
	}
}

// Start background polling
const POLLING_INTERVAL = 2000; // 2 seconds - more frequent than before since we're only doing this server-side
setInterval(pollAndBroadcastStreams, POLLING_INTERVAL);

// Initial poll
pollAndBroadcastStreams();

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const roomName = searchParams.get("room");

	if (!roomName) {
		return new Response("Room name is required", { status: 400 });
	}

	const clientId = `${roomName}-${Date.now()}-${Math.random()
		.toString(36)
		.substr(2, 9)}`;
	console.log(`🔗 New SSE client connected: ${clientId} for room: ${roomName}`);

	// Create a custom readable stream using the newer approach
	const encoder = new TextEncoder();

	const readable = new ReadableStream({
		start(controller) {
			// Store the controller for this client
			connectedClients.set(clientId, controller);

			const sendMessage = (data: Record<string, unknown>) => {
				const message = `data: ${JSON.stringify(data)}\n\n`;
				try {
					controller.enqueue(encoder.encode(message));
				} catch (error) {
					console.error(`Failed to send message to ${clientId}:`, error);
					connectedClients.delete(clientId);
				}
			};

			// Send initial connection message
			sendMessage({
				type: "connected",
				clientId,
				roomName,
			});

			// Send current streams for this room if available
			const currentRoomStreams = currentStreams.get(roomName) || [];
			if (currentRoomStreams.length > 0) {
				sendMessage({
					type: "streams_update",
					roomName,
					streams: currentRoomStreams,
				});
			}

			// Replace the controller with a wrapper that uses the encoder
			const originalController = controller;
			const wrappedController = {
				enqueue: (data: string) => {
					try {
						originalController.enqueue(encoder.encode(data));
					} catch (error) {
						console.error(`Failed to enqueue to ${clientId}:`, error);
						connectedClients.delete(clientId);
					}
				},
			};
			connectedClients.set(clientId, wrappedController);
		},
		cancel() {
			console.log(`🔌 SSE client disconnected: ${clientId}`);
			connectedClients.delete(clientId);
		},
	});

	return new Response(readable, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}

export async function OPTIONS() {
	return new Response(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}

import { NextRequest, NextResponse } from "next/server";

// Simple in-memory store for room participants
// In production, you'd use Redis or another persistent store
const roomParticipants = new Map<string, Set<string>>();
const participantLastSeen = new Map<string, number>();

export async function POST(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const roomName = searchParams.get("room");
		const identity = searchParams.get("identity");
		const action = searchParams.get("action"); // "join" or "leave"

		if (!roomName || !identity) {
			return NextResponse.json(
				{ error: "Missing room or identity parameter" },
				{ status: 400 }
			);
		}

		const participantKey = `${roomName}:${identity}`;

		if (action === "leave") {
			// Remove participant from room
			if (roomParticipants.has(roomName)) {
				roomParticipants.get(roomName)?.delete(identity);
			}
			participantLastSeen.delete(participantKey);
			console.log(`👋 ${identity} left room ${roomName}`);
		} else {
			// Add participant to room (default action)
			if (!roomParticipants.has(roomName)) {
				roomParticipants.set(roomName, new Set());
			}
			roomParticipants.get(roomName)?.add(identity);
			participantLastSeen.set(participantKey, Date.now());
			console.log(`👋 ${identity} joined room ${roomName}`);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("❌ Presence tracking error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const roomName = searchParams.get("room");

		if (!roomName) {
			return NextResponse.json(
				{ error: "Missing room parameter" },
				{ status: 400 }
			);
		}

		// Clean up stale participants (inactive for more than 30 seconds)
		const now = Date.now();
		const staleThreshold = 30000; // 30 seconds

		for (const [key, lastSeen] of participantLastSeen.entries()) {
			if (now - lastSeen > staleThreshold) {
				const [room, identity] = key.split(":");
				if (roomParticipants.has(room)) {
					roomParticipants.get(room)?.delete(identity);
				}
				participantLastSeen.delete(key);
				console.log(
					`🧹 Cleaned up stale participant: ${identity} from ${room}`
				);
			}
		}

		const participants = Array.from(roomParticipants.get(roomName) || []);

		return NextResponse.json({
			room: roomName,
			participants,
			count: participants.length,
		});
	} catch (error) {
		console.error("❌ Get presence error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

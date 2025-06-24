import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";

// Configuration from environment variables
// Using hardcoded localhost URLs for now - can be made configurable later

export async function POST(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);

		const roomName = searchParams.get("roomName") || uuidv4();
		const identity = searchParams.get("identity") || `Guest-${nanoid()}`;
		const name = searchParams.get("name") || "Guest";

		const streamKey = `${roomName}/${identity}`;
		const timestamp = new Date().toISOString();

		const token = {
			roomName,
			identity,
			name,
			streamKey,
			timestamp,
			// WHIP/WHEP URLs using proxy endpoints
			whipUrl: `/api/srs-proxy/whip?app=${encodeURIComponent(
				roomName
			)}&stream=${encodeURIComponent(identity)}`,
			whepUrl: `/api/srs-proxy/whep?app=${encodeURIComponent(
				roomName
			)}&stream=${encodeURIComponent(identity)}`,
			hlsUrl: `http://localhost:8080/${roomName}/${identity}.m3u8`,
			iceServers: [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun1.l.google.com:19302" },
				{ urls: "stun:stun2.l.google.com:19302" },
			],
		};

		return NextResponse.json(token);
	} catch (error) {
		console.error("❌ Error generating SRS room access:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}

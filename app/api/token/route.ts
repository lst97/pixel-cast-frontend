import { NextRequest, NextResponse } from "next/server";
import { AccessToken, VideoGrant } from "livekit-server-sdk";

// Configuration from environment variables
const config = {
	apiKey: process.env.LIVEKIT_API_KEY,
	apiSecret: process.env.LIVEKIT_API_SECRET,
};

// Request body interface
interface TokenRequest {
	roomName: string;
	identity: string;
	name?: string;
}

export async function POST(request: NextRequest) {
	try {
		// Validate required configuration
		if (!config.apiKey || !config.apiSecret) {
			console.error(
				"❌ Missing required environment variables: LIVEKIT_API_KEY and LIVEKIT_API_SECRET"
			);
			return NextResponse.json(
				{
					error: "Server configuration error: Missing LiveKit credentials",
				},
				{ status: 500 }
			);
		}

		// Parse request body
		const body: TokenRequest = await request.json();

		// Input validation
		if (
			!body.roomName ||
			typeof body.roomName !== "string" ||
			body.roomName.trim() === ""
		) {
			return NextResponse.json(
				{
					error:
						"Missing or invalid 'roomName' field. Must be a non-empty string.",
				},
				{ status: 400 }
			);
		}

		if (
			!body.identity ||
			typeof body.identity !== "string" ||
			body.identity.trim() === ""
		) {
			return NextResponse.json(
				{
					error:
						"Missing or invalid 'identity' field. Must be a non-empty string.",
				},
				{ status: 400 }
			);
		}

		// Sanitize inputs
		const roomName = body.roomName.trim();
		const identity = body.identity.trim();
		const name = body.name?.trim() || identity;

		// Create LiveKit access token
		const at = new AccessToken(config.apiKey, config.apiSecret, {
			identity: identity,
			name: name,
		});

		// Define permissions (VideoGrant)
		const grant: VideoGrant = {
			room: roomName,
			roomJoin: true,
			canPublish: true, // Allow publishing video/audio
			canPublishData: true, // Allow publishing data messages
			canSubscribe: true, // Allow receiving others' streams
		};

		at.addGrant(grant);

		// Generate JWT token
		const token = await at.toJwt();

		// Return token
		return NextResponse.json({ token });
	} catch (error) {
		console.error("❌ Error generating token:", error);

		// Handle JSON parsing errors
		if (error instanceof SyntaxError) {
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 }
			);
		}

		// Handle other errors
		return NextResponse.json(
			{ error: "Internal server error while generating token" },
			{ status: 500 }
		);
	}
}

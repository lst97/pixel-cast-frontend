import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const streamId = searchParams.get("stream");

		if (!streamId) {
			return NextResponse.json(
				{ error: "Stream ID is required" },
				{ status: 400 }
			);
		}

		console.log(`🛑 Attempting to stop stream: ${streamId}`);

		// Try to kick the client/stream using SRS API
		const kickResponse = await fetch(
			`http://localhost:1985/api/v1/clients/${encodeURIComponent(streamId)}`,
			{
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			}
		);

		if (!kickResponse.ok) {
			console.warn(`⚠️ Could not kick client directly: ${kickResponse.status}`);

			// Try alternative approach - get stream info and kick all clients
			try {
				const streamsResponse = await fetch(
					"http://localhost:1985/api/v1/streams/"
				);
				if (streamsResponse.ok) {
					const streamsData = await streamsResponse.json();
					const targetStream = streamsData.streams?.find(
						(stream: { name: string }) => stream.name === streamId
					);

					if (targetStream && targetStream.clients) {
						// Kick all clients associated with this stream
						for (const client of targetStream.clients) {
							try {
								await fetch(
									`http://localhost:1985/api/v1/clients/${client.id}`,
									{ method: "DELETE" }
								);
								console.log(
									`✅ Kicked client ${client.id} from stream ${streamId}`
								);
							} catch (clientKickError) {
								console.warn(
									`⚠️ Could not kick client ${client.id}:`,
									clientKickError
								);
							}
						}
					}
				}
			} catch (alternativeError) {
				console.warn("⚠️ Alternative kick method failed:", alternativeError);
			}
		} else {
			console.log(`✅ Successfully stopped stream: ${streamId}`);
		}

		return NextResponse.json(
			{ success: true, message: `Stream ${streamId} stop requested` },
			{
				status: 200,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			}
		);
	} catch (error) {
		console.error("❌ Error stopping stream:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function OPTIONS() {
	// Handle CORS preflight requests
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}

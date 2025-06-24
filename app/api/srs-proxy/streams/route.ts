import { NextResponse } from "next/server";

export async function GET() {
	try {
		console.log("🔍 Fetching current streams from SRS");

		// Forward request to SRS server
		const srsResponse = await fetch("http://localhost:1985/api/v1/streams/", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!srsResponse.ok) {
			const errorText = await srsResponse.text();
			console.error(
				`❌ SRS streams request failed: ${srsResponse.status} ${srsResponse.statusText}`
			);
			console.error(`❌ SRS Error response: ${errorText}`);
			return NextResponse.json(
				{ error: `SRS server error: ${srsResponse.status} - ${errorText}` },
				{ status: srsResponse.status }
			);
		}

		const streamsData = await srsResponse.json();
		console.log(
			`✅ Streams request successful, found ${
				streamsData.streams?.length || 0
			} streams`
		);

		// Return streams data with proper CORS headers
		return NextResponse.json(streamsData, {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		});
	} catch (error) {
		console.error("❌ Error in streams proxy:", error);
		console.error(
			"❌ Error stack:",
			error instanceof Error ? error.stack : "No stack available"
		);
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
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}

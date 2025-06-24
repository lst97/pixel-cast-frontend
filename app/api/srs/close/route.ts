import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		console.log("🔌 SRS Close:", {
			action: body.action,
			client_id: body.client_id,
			ip: body.ip,
			vhost: body.vhost,
			app: body.app,
			stream: body.stream,
			timestamp: new Date().toISOString(),
		});

		// Log the disconnection for room management
		// You can add database logging here if needed

		return NextResponse.json({
			code: 0,
			message: "success",
		});
	} catch (error) {
		console.error("❌ SRS Close Error:", error);
		return NextResponse.json({
			code: 0,
			message: "success",
		});
	}
}

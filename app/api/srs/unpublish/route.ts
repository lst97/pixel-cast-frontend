import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		console.log("📺 SRS Unpublish (Screen Share Stopped):", {
			action: body.action,
			client_id: body.client_id,
			ip: body.ip,
			vhost: body.vhost,
			app: body.app,
			stream: body.stream,
			timestamp: new Date().toISOString(),
		});

		// Handle screen sharing stopped event
		// You can add cleanup logic here if needed

		return NextResponse.json({
			code: 0,
			message: "success",
		});
	} catch (error) {
		console.error("❌ SRS Unpublish Error:", error);
		return NextResponse.json({
			code: 0,
			message: "success",
		});
	}
}

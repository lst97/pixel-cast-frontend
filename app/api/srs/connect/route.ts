import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		console.log("🔗 SRS Connect:", {
			action: body.action,
			client_id: body.client_id,
			ip: body.ip,
			vhost: body.vhost,
			app: body.app,
			stream: body.stream,
			param: body.param,
			timestamp: new Date().toISOString(),
		});

		// Log the connection for room management
		// You can add database logging here if needed

		// Return success to allow the connection
		return NextResponse.json({
			code: 0,
			message: "success",
		});
	} catch (error) {
		console.error("❌ SRS Connect Error:", error);
		return NextResponse.json(
			{
				code: 1,
				message: "connection rejected",
			},
			{ status: 400 }
		);
	}
}

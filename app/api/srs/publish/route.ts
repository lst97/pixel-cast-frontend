import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		console.log("📺 SRS Publish (Screen Share):", {
			action: body.action,
			client_id: body.client_id,
			ip: body.ip,
			vhost: body.vhost,
			app: body.app,
			stream: body.stream,
			param: body.param,
			timestamp: new Date().toISOString(),
		});

		// Validate that this is a screen sharing stream
		// You can add additional validation logic here

		return NextResponse.json({
			code: 0,
			message: "success",
		});
	} catch (error) {
		console.error("❌ SRS Publish Error:", error);
		return NextResponse.json(
			{
				code: 1,
				message: "publish rejected",
			},
			{ status: 400 }
		);
	}
}

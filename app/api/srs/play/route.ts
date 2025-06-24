import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		console.log("👀 SRS Play (Viewer Joined):", {
			action: body.action,
			client_id: body.client_id,
			ip: body.ip,
			vhost: body.vhost,
			app: body.app,
			stream: body.stream,
			param: body.param,
			timestamp: new Date().toISOString(),
		});

		// Log viewer joining to watch screen share
		// You can add analytics or room management here

		return NextResponse.json({
			code: 0,
			message: "success",
		});
	} catch (error) {
		console.error("❌ SRS Play Error:", error);
		return NextResponse.json(
			{
				code: 1,
				message: "play rejected",
			},
			{ status: 400 }
		);
	}
}

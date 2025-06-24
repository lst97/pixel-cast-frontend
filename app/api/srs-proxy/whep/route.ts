import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		// Get query parameters from the request
		const { searchParams } = new URL(request.url);
		const app = searchParams.get("app");
		const stream = searchParams.get("stream");

		if (!app || !stream) {
			console.error("❌ Missing app or stream parameter");
			return NextResponse.json(
				{ error: "Missing app or stream parameter" },
				{ status: 400 }
			);
		}

		// Get SDP offer from request body
		const sdpOffer = await request.text();

		if (!sdpOffer) {
			console.error("❌ Missing SDP offer in request body");
			return NextResponse.json(
				{ error: "Missing SDP offer in request body" },
				{ status: 400 }
			);
		}

		console.log(`🔀 Proxying WHEP request for app: ${app}, stream: ${stream}`);
		console.log(`📤 SDP Offer length: ${sdpOffer.length} chars`);

		// Check if client requested low latency
		const preferLowLatency =
			request.headers.get("X-Prefer-Low-Latency") === "true";

		// Optimize SDP for low latency playback if requested
		let optimizedSdp = sdpOffer;
		if (preferLowLatency) {
			console.log("⚡ Applying low-latency WHEP SDP optimizations");

			// Request enhanced RTCP feedback for better playback
			if (
				!optimizedSdp.includes("a=rtcp-fb:") &&
				optimizedSdp.includes("m=video")
			) {
				optimizedSdp = optimizedSdp.replace(
					/(a=rtpmap:\d+ H264\/90000)/g,
					"$1\r\na=rtcp-fb:* nack\r\na=rtcp-fb:* nack pli\r\na=rtcp-fb:* ccm fir"
				);
			}

			// Request transport-wide congestion control for viewer
			if (!optimizedSdp.includes("transport-cc")) {
				optimizedSdp = optimizedSdp.replace(
					/(a=rtpmap:\d+ H264\/90000)/g,
					"$1\r\na=rtcp-fb:* transport-cc"
				);
			}

			// Add low latency playback preferences
			optimizedSdp = optimizedSdp.replace(
				/(a=setup:actpass)/g,
				"$1\r\na=x-google-flag:low-latency-playback"
			);

			// Request reduced jitter buffer if supported
			if (optimizedSdp.includes("m=video")) {
				optimizedSdp = optimizedSdp.replace(
					/(m=video [^\r\n]+)/,
					"$1\r\na=x-google-min-playout-delay:0\r\na=x-google-max-playout-delay:100"
				);
			}
		}

		// Forward request to SRS server
		const srsUrl = `http://localhost:1985/rtc/v1/whep/?app=${encodeURIComponent(
			app
		)}&stream=${encodeURIComponent(stream)}`;
		console.log(`🎯 SRS URL: ${srsUrl}`);

		const srsResponse = await fetch(srsUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/sdp",
				// Pass low latency preference to SRS
				...(preferLowLatency && { "X-Low-Latency-Playback": "true" }),
			},
			body: optimizedSdp,
		});

		console.log(
			`📡 SRS Response status: ${srsResponse.status} ${srsResponse.statusText}`
		);

		if (!srsResponse.ok) {
			const errorText = await srsResponse.text();
			console.error(
				`❌ SRS WHEP request failed: ${srsResponse.status} ${srsResponse.statusText}`
			);
			console.error(`❌ SRS Error response: ${errorText}`);
			return NextResponse.json(
				{ error: `SRS server error: ${srsResponse.status} - ${errorText}` },
				{ status: srsResponse.status }
			);
		}

		let sdpAnswer = await srsResponse.text();
		console.log(`✅ WHEP request successful for ${app}/${stream}`);
		console.log(`📥 SDP Answer length: ${sdpAnswer.length} chars`);

		// Optimize SDP answer for low latency playback
		if (preferLowLatency) {
			console.log("⚡ Optimizing WHEP SDP answer for low latency playback");

			// Ensure low latency playback feedback is configured
			if (!sdpAnswer.includes("a=rtcp-fb:") && sdpAnswer.includes("m=video")) {
				sdpAnswer = sdpAnswer.replace(
					/(a=rtpmap:\d+ H264\/90000)/g,
					"$1\r\na=rtcp-fb:* nack\r\na=rtcp-fb:* nack pli\r\na=rtcp-fb:* ccm fir\r\na=rtcp-fb:* transport-cc"
				);
			}

			// Add playout delay constraints if not present
			if (
				!sdpAnswer.includes("x-google-min-playout-delay") &&
				sdpAnswer.includes("m=video")
			) {
				sdpAnswer = sdpAnswer.replace(
					/(m=video [^\r\n]+)/,
					"$1\r\na=x-google-min-playout-delay:0\r\na=x-google-max-playout-delay:100"
				);
			}
		}

		// Return SDP answer with proper CORS headers
		return new NextResponse(sdpAnswer, {
			status: 200,
			headers: {
				"Content-Type": "application/sdp",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, X-Prefer-Low-Latency",
			},
		});
	} catch (error) {
		console.error("❌ Error in WHEP proxy:", error);
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
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}

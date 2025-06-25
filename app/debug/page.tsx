"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
	buildApiUrl,
	buildApiUrlWithParams,
	ENDPOINTS,
	API_CONFIG,
} from "@/lib/config";

interface StreamInfo {
	app: string;
	name: string;
	url?: string;
	clients?: number;
}

interface SRSStreamsResponse {
	streams?: StreamInfo[];
}

export default function DebugPage() {
	const [srsStatus, setSrsStatus] = useState<"checking" | "online" | "offline">(
		"checking"
	);
	const [streams, setStreams] = useState<StreamInfo[]>([]);
	const [testResults, setTestResults] = useState<string[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);

	// Test SRS connectivity
	const testSRSConnection = async () => {
		const results: string[] = [];

		try {
			// Test SRS API endpoint
			results.push("🔍 Testing SRS API connectivity...");

			const apiResponse = await fetch(
				`${API_CONFIG.SRS_DIRECT.API}/api/v1/summaries`
			);
			if (apiResponse.ok) {
				results.push("✅ SRS API is accessible");
				setSrsStatus("online");

				const data = await apiResponse.json();
				results.push(`📊 SRS Server Info: ${JSON.stringify(data, null, 2)}`);
			} else {
				results.push("❌ SRS API is not accessible");
				setSrsStatus("offline");
			}
		} catch (error) {
			results.push(`❌ SRS API connection failed: ${error}`);
			setSrsStatus("offline");
		}

		try {
			// Test streams endpoint
			results.push("🔍 Testing SRS streams endpoint...");

			const streamsResponse = await fetch(
				`${API_CONFIG.SRS_DIRECT.API}/api/v1/streams/`
			);
			if (streamsResponse.ok) {
				results.push("✅ SRS streams endpoint is accessible");

				const streamsData: SRSStreamsResponse = await streamsResponse.json();
				setStreams(streamsData.streams || []);
				results.push(`📺 Active streams: ${streamsData.streams?.length || 0}`);
			} else {
				results.push("❌ SRS streams endpoint is not accessible");
			}
		} catch (error) {
			results.push(`❌ SRS streams endpoint failed: ${error}`);
		}

		setTestResults(results);
	};

	// Test token generation
	const testTokenGeneration = async () => {
		const results = [...testResults];

		try {
			results.push("🔍 Testing token generation...");

			const response = await fetch(
				buildApiUrlWithParams(ENDPOINTS.TOKEN, {
					roomName: "debug-room",
					identity: "debug-user",
				}),
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}
			);

			if (response.ok) {
				const tokenData = await response.json();
				results.push("✅ Token generation successful");
				results.push(`🎫 Token data: ${JSON.stringify(tokenData, null, 2)}`);
			} else {
				const errorData = await response.json();
				results.push(
					`❌ Token generation failed: ${JSON.stringify(errorData)}`
				);
			}
		} catch (error) {
			results.push(`❌ Token generation error: ${error}`);
		}

		setTestResults(results);
	};

	// Test screen sharing
	const testScreenShare = async () => {
		const results = [...testResults];

		try {
			results.push("🔍 Testing screen sharing...");

			// Get screen capture
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: { width: 1280, height: 720, frameRate: 30 },
				audio: false,
			});

			results.push("✅ Screen capture successful");

			// Create WebRTC peer connection
			const pc = new RTCPeerConnection({
				iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
			});

			// Add stream to peer connection
			stream.getTracks().forEach((track) => {
				pc.addTrack(track, stream);
			});

			// Create offer
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);

			results.push("✅ WebRTC offer created");

			// Test WHIP endpoint (using SRS direct for testing)
			const whipUrl = `${API_CONFIG.SRS_DIRECT.API}/rtc/v1/whip/?app=debug-room&stream=debug-user`;
			const whipResponse = await fetch(whipUrl, {
				method: "POST",
				headers: { "Content-Type": "application/sdp" },
				body: offer.sdp,
			});

			if (whipResponse.ok) {
				const answerSdp = await whipResponse.text();
				await pc.setRemoteDescription(
					new RTCSessionDescription({ type: "answer", sdp: answerSdp })
				);

				results.push("✅ WHIP connection successful");
				results.push("🎥 Screen sharing active!");
				setIsStreaming(true);

				// Stop after 10 seconds
				setTimeout(() => {
					stream.getTracks().forEach((track) => track.stop());
					pc.close();
					setIsStreaming(false);
					results.push("🛑 Screen sharing stopped");
					setTestResults([...results]);
				}, 10000);
			} else {
				results.push(`❌ WHIP connection failed: ${whipResponse.status}`);
			}
		} catch (error) {
			results.push(`❌ Screen sharing test failed: ${error}`);
		}

		setTestResults(results);
	};

	// Refresh streams
	const refreshStreams = async () => {
		try {
			const response = await fetch(buildApiUrl(ENDPOINTS.SRS_PROXY.STREAMS));
			if (response.ok) {
				const data: SRSStreamsResponse = await response.json();
				setStreams(data.streams || []);
			}
		} catch (error) {
			console.error("Failed to refresh streams:", error);
		}
	};

	// Auto-refresh streams
	useEffect(() => {
		const interval = setInterval(refreshStreams, 3000);
		return () => clearInterval(interval);
	}, []);

	// Initial test
	useEffect(() => {
		testSRSConnection();
	}, []);

	return (
		<div className='container mx-auto px-4 py-8 max-w-4xl'>
			<h1 className='text-3xl font-bold mb-8'>PixelCast Debug Dashboard</h1>

			{/* SRS Status */}
			<Card className='mb-6'>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						SRS Server Status
						<Badge variant={srsStatus === "online" ? "default" : "destructive"}>
							{srsStatus === "checking" ? "Checking..." : srsStatus}
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='flex gap-2 mb-4'>
						<Button onClick={testSRSConnection}>Test SRS Connection</Button>
						<Button onClick={testTokenGeneration}>Test Token Generation</Button>
						<Button onClick={testScreenShare} disabled={isStreaming}>
							{isStreaming ? "Screen Sharing Active..." : "Test Screen Share"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Active Streams */}
			<Card className='mb-6'>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						Active Streams
						<Badge variant='outline'>{streams.length}</Badge>
						<Button size='sm' onClick={refreshStreams}>
							Refresh
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{streams.length === 0 ? (
						<p className='text-gray-500'>No active streams</p>
					) : (
						<div className='space-y-2'>
							{streams.map((stream, index) => (
								<div key={index} className='p-3 border rounded-lg'>
									<div className='flex justify-between items-center'>
										<div>
											<strong>App:</strong> {stream.app} <br />
											<strong>Stream:</strong> {stream.name}
										</div>
										<div className='text-right'>
											<Badge variant='outline'>
												{stream.clients || 0} clients
											</Badge>
										</div>
									</div>
									{stream.url && (
										<div className='mt-2 text-sm text-gray-600'>
											<strong>URL:</strong> {stream.url}
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Test Results */}
			<Card>
				<CardHeader>
					<CardTitle>Test Results</CardTitle>
				</CardHeader>
				<CardContent>
					{testResults.length === 0 ? (
						<p className='text-gray-500'>No test results yet</p>
					) : (
						<div className='space-y-2 max-h-96 overflow-y-auto'>
							{testResults.map((result, index) => (
								<Alert key={index}>
									<AlertDescription className='font-mono text-sm'>
										{result}
									</AlertDescription>
								</Alert>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Quick Links */}
			<div className='mt-8 p-4 bg-gray-50 rounded-lg'>
				<h3 className='font-semibold mb-2'>Quick Links</h3>
				<div className='flex gap-2 flex-wrap'>
					<Link href='/' className='text-blue-600 hover:underline'>
						Home
					</Link>
					<Link
						href='/room/test-room'
						className='text-blue-600 hover:underline'
					>
						Test Room
					</Link>
					<a
						href='http://localhost:1985/api/v1/summaries'
						target='_blank'
						className='text-blue-600 hover:underline'
					>
						SRS API Summary
					</a>
					<a
						href='http://localhost:8080'
						target='_blank'
						className='text-blue-600 hover:underline'
					>
						SRS Web Console
					</a>
				</div>
			</div>
		</div>
	);
}

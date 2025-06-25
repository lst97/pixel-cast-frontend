"use client";

import React, { useState } from "react";
import { useStreamSSE } from "@/components/SRSScreenShare/hooks/useStreamSSE";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { API_CONFIG, ENDPOINTS, buildApiUrl } from "@/lib/config";
import {
	CheckCircle,
	XCircle,
	Clock,
	RefreshCw,
	Wifi,
	Server,
	Radio,
} from "lucide-react";

interface ConnectionTest {
	name: string;
	status: "idle" | "testing" | "success" | "error";
	url: string;
	result?: unknown;
	error?: string;
	duration?: number;
}

export default function SSETestPage() {
	const [roomName, setRoomName] = useState("test-room");
	const [isActive, setIsActive] = useState(false);
	const [connectionTests, setConnectionTests] = useState<ConnectionTest[]>([
		{
			name: "Backend Health",
			status: "idle",
			url: buildApiUrl(ENDPOINTS.HEALTH),
		},
		{ name: "Backend API Root", status: "idle", url: buildApiUrl("/") },
		{
			name: "Token Generation",
			status: "idle",
			url: buildApiUrl(ENDPOINTS.TOKEN),
		},
		{
			name: "SRS API Status",
			status: "idle",
			url: `${API_CONFIG.SRS_DIRECT.API}/api/v1/versions`,
		},
		{
			name: "SRS Publish Endpoint (JSON Format)",
			status: "idle",
			url: `${API_CONFIG.SRS_DIRECT.API}/rtc/v1/publish/`,
		},
		{
			name: "SRS Streams",
			status: "idle",
			url: `${API_CONFIG.SRS_DIRECT.API}/api/v1/streams`,
		},
		{
			name: "Backend Streams Proxy",
			status: "idle",
			url: buildApiUrl(ENDPOINTS.SRS_PROXY.STREAMS),
		},
		{
			name: "Presence API",
			status: "idle",
			url: buildApiUrl(ENDPOINTS.SRS_PROXY.PRESENCE) + "?room=test-room",
		},
	]);

	const { streams, isConnected, error, reconnect } = useStreamSSE(
		isActive ? roomName : ""
	);

	const runConnectionTest = async (index: number) => {
		const test = connectionTests[index];
		const startTime = Date.now();

		setConnectionTests((prev) =>
			prev.map((t, i) =>
				i === index
					? { ...t, status: "testing", error: undefined, result: undefined }
					: t
			)
		);

		try {
			let response: Response;
			let result: unknown;

			if (test.name === "Token Generation") {
				// POST request for token generation
				response = await fetch(test.url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ roomName: "test", identity: "test-user" }),
				});
			} else {
				// GET request for other endpoints
				response = await fetch(test.url, {
					method: "GET",
					headers: { Accept: "application/json" },
				});
			}

			if (response.ok) {
				result = await response.json();
				const duration = Date.now() - startTime;

				setConnectionTests((prev) =>
					prev.map((t, i) =>
						i === index ? { ...t, status: "success", result, duration } : t
					)
				);
			} else {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
		} catch (err) {
			const duration = Date.now() - startTime;
			const errorMessage = err instanceof Error ? err.message : "Unknown error";

			setConnectionTests((prev) =>
				prev.map((t, i) =>
					i === index
						? { ...t, status: "error", error: errorMessage, duration }
						: t
				)
			);
		}
	};

	const runAllTests = async () => {
		for (let i = 0; i < connectionTests.length; i++) {
			await runConnectionTest(i);
			// Small delay between tests
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
	};

	const resetAllTests = () => {
		setConnectionTests((prev) =>
			prev.map((t) => ({
				...t,
				status: "idle" as const,
				result: undefined,
				error: undefined,
				duration: undefined,
			}))
		);
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "success":
				return <CheckCircle className='h-4 w-4 text-green-500' />;
			case "error":
				return <XCircle className='h-4 w-4 text-red-500' />;
			case "testing":
				return <Clock className='h-4 w-4 text-yellow-500 animate-spin' />;
			default:
				return <div className='h-4 w-4 rounded-full bg-gray-300' />;
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "success":
				return (
					<Badge variant='default' className='bg-green-500'>
						✓ Connected
					</Badge>
				);
			case "error":
				return <Badge variant='destructive'>✗ Failed</Badge>;
			case "testing":
				return <Badge variant='secondary'>Testing...</Badge>;
			default:
				return <Badge variant='outline'>Not Tested</Badge>;
		}
	};

	const startTest = () => {
		setIsActive(true);
	};

	const stopTest = () => {
		setIsActive(false);
	};

	return (
		<div className='container mx-auto p-8 max-w-6xl'>
			<div className='text-center mb-8'>
				<h1 className='text-3xl font-bold mb-4 flex items-center justify-center gap-2'>
					<Wifi className='h-8 w-8' />
					PixelCast System Connectivity Test
				</h1>
				<p className='text-gray-600 max-w-3xl mx-auto'>
					Comprehensive testing suite for backend services, SRS server
					connectivity, and real-time streaming functionality.
				</p>
			</div>

			<div className='space-y-6'>
				{/* System Connectivity Tests */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Server className='h-5 w-5' />
							System Connectivity Tests
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='flex gap-2 mb-4'>
							<Button
								onClick={runAllTests}
								disabled={connectionTests.some((t) => t.status === "testing")}
							>
								<RefreshCw className='h-4 w-4 mr-2' />
								Run All Tests
							</Button>
							<Button onClick={resetAllTests} variant='outline'>
								Reset All
							</Button>
						</div>

						<div className='grid gap-3'>
							{connectionTests.map((test, index) => (
								<div key={test.name} className='border rounded-lg p-4'>
									<div className='flex items-center justify-between mb-2'>
										<div className='flex items-center gap-2'>
											{getStatusIcon(test.status)}
											<h3 className='font-medium'>{test.name}</h3>
										</div>
										<div className='flex items-center gap-2'>
											{getStatusBadge(test.status)}
											{test.duration && (
												<Badge variant='outline'>{test.duration}ms</Badge>
											)}
											<Button
												size='sm'
												variant='outline'
												onClick={() => runConnectionTest(index)}
												disabled={test.status === "testing"}
											>
												Test
											</Button>
										</div>
									</div>

									<div className='text-sm text-gray-600 mb-2'>
										<code className='bg-gray-100 px-2 py-1 rounded text-xs'>
											{test.url}
										</code>
									</div>

									{test.error && (
										<div className='text-sm text-red-600 bg-red-50 p-2 rounded'>
											❌ {test.error}
										</div>
									)}

									{test.result && (
										<details className='text-sm'>
											<summary className='cursor-pointer text-gray-600 hover:text-gray-800'>
												View Response Data
											</summary>
											<pre className='bg-gray-100 p-2 rounded text-xs mt-2 overflow-auto max-h-40'>
												{JSON.stringify(test.result, null, 2)}
											</pre>
										</details>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* SSE Stream Test Controls */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Radio className='h-5 w-5' />
							Real-time Stream Updates Test
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div>
							<label className='block text-sm font-medium mb-2'>
								Room Name:
							</label>
							<Input
								value={roomName}
								onChange={(e) => setRoomName(e.target.value)}
								placeholder='Enter room name'
								disabled={isActive}
							/>
						</div>

						<div className='flex gap-2'>
							{!isActive ? (
								<Button onClick={startTest} disabled={!roomName}>
									Start SSE Connection
								</Button>
							) : (
								<Button onClick={stopTest} variant='destructive'>
									Stop SSE Connection
								</Button>
							)}

							{isActive && (
								<Button onClick={reconnect} variant='outline'>
									Reconnect
								</Button>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Connection Status */}
				{isActive && (
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								SSE Connection Status
								<div
									className={`w-3 h-3 rounded-full ${
										isConnected
											? "bg-green-500"
											: error
											? "bg-red-500"
											: "bg-yellow-500"
									} ${isConnected ? "animate-pulse" : ""}`}
								/>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-2'>
								<div className='flex items-center gap-2'>
									<Badge variant={isConnected ? "default" : "destructive"}>
										{isConnected ? "Connected" : "Disconnected"}
									</Badge>
									{error && <Badge variant='destructive'>Error: {error}</Badge>}
								</div>
								<p className='text-sm text-gray-600'>
									Connected to room:{" "}
									<code className='bg-gray-100 px-2 py-1 rounded'>
										{roomName}
									</code>
								</p>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Stream Data */}
				{isActive && (
					<Card>
						<CardHeader>
							<CardTitle>
								Real-time Stream Data ({streams.length} streams)
							</CardTitle>
						</CardHeader>
						<CardContent>
							{streams.length === 0 ? (
								<p className='text-gray-500 italic'>
									No streams available in this room
								</p>
							) : (
								<div className='space-y-3'>
									{streams.map((stream, index) => (
										<div
											key={`${stream.name}-${index}`}
											className='border rounded-lg p-4'
										>
											<div className='flex items-center justify-between mb-2'>
												<h3 className='font-medium'>{stream.name}</h3>
												<div className='flex gap-2'>
													<Badge
														variant={
															stream.publish.active ? "default" : "secondary"
														}
													>
														{stream.publish.active ? "Active" : "Inactive"}
													</Badge>
													{stream.video && (
														<Badge variant='outline'>Video</Badge>
													)}
													{stream.audio && (
														<Badge variant='outline'>Audio</Badge>
													)}
												</div>
											</div>

											<div className='text-sm text-gray-600 space-y-1'>
												<div>
													Room: <code>{stream.app}</code>
												</div>
												<div>
													Stream ID: <code>{stream.id}</code>
												</div>
												{stream.video && (
													<div>
														Video Codec: <code>{stream.video.codec}</code>
													</div>
												)}
												{stream.audio && (
													<div>
														Audio Codec: <code>{stream.audio.codec}</code>
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				)}

				{/* Environment Information */}
				<Card>
					<CardHeader>
						<CardTitle>Environment Configuration</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
							<div>
								<h4 className='font-medium mb-2'>Backend Configuration</h4>
								<div className='space-y-1 text-gray-600'>
									<div>
										Backend URL: <code>{API_CONFIG.BASE_URL}</code>
									</div>
								</div>
							</div>
							<div>
								<h4 className='font-medium mb-2'>SRS Server Configuration</h4>
								<div className='space-y-1 text-gray-600'>
									<div>
										API: <code>{API_CONFIG.SRS_DIRECT.API}</code>
									</div>
									<div>
										WebRTC: <code>{API_CONFIG.SRS_DIRECT.WEBRTC}</code>
									</div>
									<div>
										HTTP: <code>{API_CONFIG.SRS_DIRECT.HTTP}</code>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Instructions */}
				<Card>
					<CardHeader>
						<CardTitle>Testing Instructions</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-2 text-sm'>
							<p>
								<strong>System Tests:</strong>
							</p>
							<ol className='list-decimal list-inside space-y-1 ml-4'>
								<li>Click "Run All Tests" to check all system connectivity</li>
								<li>Green checkmarks indicate successful connections</li>
								<li>
									Red X marks indicate connection failures that need attention
								</li>
								<li>
									Click individual "Test" buttons to recheck specific services
								</li>
							</ol>

							<p className='mt-4'>
								<strong>SSE Stream Tests:</strong>
							</p>
							<ol className='list-decimal list-inside space-y-1 ml-4'>
								<li>Enter a room name and click "Start SSE Connection"</li>
								<li>
									The connection status will show if real-time updates are
									working
								</li>
								<li>
									Open another tab and go to <code>/room/[your-room-name]</code>{" "}
									to start streaming
								</li>
								<li>
									Watch this page update in real-time when streams start/stop
								</li>
								<li>This tests the Server-Sent Events functionality</li>
							</ol>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

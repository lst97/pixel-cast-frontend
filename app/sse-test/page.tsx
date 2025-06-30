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
	result?: object | string | number | boolean | null;
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
			let result: ConnectionTest["result"];

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
				result = (await response.json()) as ConnectionTest["result"];
				const duration = Date.now() - startTime;

				setConnectionTests((prev) =>
					prev.map((t, i) =>
						i === index
							? {
									...t,
									status: "success",
									result: result as ConnectionTest["result"],
									duration,
							  }
							: t
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
										URL:{" "}
										<code className='bg-gray-100 p-1 rounded'>{test.url}</code>
									</div>
									{test.status === "error" && (
										<div className='text-sm text-red-500'>
											Error:{" "}
											<code className='bg-red-100 p-1 rounded'>
												{test.error}
											</code>
										</div>
									)}
									{test.status === "success" && test.result && (
										<details className='text-sm text-gray-700'>
											<summary>Response Data</summary>
											<pre className='mt-2 bg-gray-100 p-2 rounded max-h-40 overflow-auto'>
												<code>
													{JSON.stringify(test.result, null, 2) as string}
												</code>
											</pre>
										</details>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* SSE Real-time Stream Monitoring */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Radio className='h-5 w-5' />
							SSE Real-time Stream Monitoring
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='mb-4 flex items-center space-x-2'>
							<Input
								type='text'
								placeholder='Enter room name'
								value={roomName}
								onChange={(e) => setRoomName(e.target.value)}
								className='max-w-xs'
							/>
							<Button onClick={startTest} disabled={isActive || !roomName}>
								Start SSE
							</Button>
							<Button onClick={stopTest} disabled={!isActive} variant='outline'>
								Stop SSE
							</Button>
							<Button
								onClick={reconnect}
								disabled={!isActive}
								variant='outline'
							>
								Reconnect
							</Button>
						</div>
						<div className='mb-4'>
							<p className='text-sm text-gray-700'>
								SSE Connection Status:{" "}
								{isConnected ? (
									<Badge className='bg-green-500'>Connected</Badge>
								) : (
									<Badge variant='destructive'>Disconnected</Badge>
								)}
							</p>
							{error && (
								<p className='text-sm text-red-500 mt-1'>
									SSE Error:{" "}
									<code className='bg-red-100 p-1 rounded'>{error}</code>
								</p>
							)}
						</div>

						<h3 className='font-semibold mb-2'>Active Streams:</h3>
						{streams.length === 0 && (
							<p className='text-gray-500 text-sm'>No active streams.</p>
						)}
						<div className='grid gap-2'>
							{streams.map((stream) => (
								<Card key={stream.id} className='bg-gray-50'>
									<CardContent className='p-4'>
										<p className='font-medium'>
											Stream ID:{" "}
											<code className='bg-gray-200 p-1 rounded'>
												{stream.id}
											</code>
										</p>
										<p className='text-sm text-gray-600'>
											Publisher ID:{" "}
											<code className='bg-gray-200 p-1 rounded'>
												{stream.publisherId || "N/A"}
											</code>
										</p>
										<p className='text-sm text-gray-600'>
											Room Name:{" "}
											<code className='bg-gray-200 p-1 rounded'>
												{stream.roomName}
											</code>
										</p>
										<p className='text-sm text-gray-600'>
											Viewers:{" "}
											<code className='bg-gray-200 p-1 rounded'>
												{stream.viewers}
											</code>
										</p>
										{stream.bitrate && (
											<p className='text-sm text-gray-600'>
												Bitrate:{" "}
												<code className='bg-gray-200 p-1 rounded'>
													{(stream.bitrate / 1000).toFixed(2)} Mbps
												</code>
											</p>
										)}
										{stream.originLatency !== undefined && (
											<p className='text-sm text-gray-600'>
												Origin Latency:{" "}
												<code className='bg-gray-200 p-1 rounded'>
													{stream.originLatency}ms
												</code>
											</p>
										)}
										{stream.edgeLatency !== undefined && (
											<p className='text-sm text-gray-600'>
												Edge Latency:{" "}
												<code className='bg-gray-200 p-1 rounded'>
													{stream.edgeLatency}ms
												</code>
											</p>
										)}
									</CardContent>
								</Card>
							))}
						</div>
					</CardContent>
				</Card>

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
								<li>
									Click &quot;Run All Tests&quot; to check all system
									connectivity
								</li>
								<li>Green checkmarks indicate successful connections</li>
								<li>
									Red X marks indicate connection failures that need attention
								</li>
								<li>
									Click individual &quot;Test&quot; buttons to recheck specific
									services
								</li>
							</ol>

							<p className='mt-4'>
								<strong>SSE Stream Tests:</strong>
							</p>
							<ol className='list-decimal list-inside space-y-1 ml-4'>
								<li>
									Enter a room name and click &quot;Start SSE Connection&quot;
								</li>
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

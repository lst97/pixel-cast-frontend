"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserIdentityDisplay } from "@/components/UserIdentityDisplay";
import {
	getPersistentIdentity,
	clearPersistentIdentity,
} from "@/lib/persistentIdentity";
import { API_CONFIG, ENDPOINTS, buildApiUrl } from "@/lib/config";
import {
	RefreshCw,
	Eye,
	TestTube,
	CheckCircle,
	XCircle,
	Clock,
	User,
	Server,
	Wifi,
} from "lucide-react";

interface ConnectionTest {
	name: string;
	status: "idle" | "testing" | "success" | "error";
	url: string;
	result?: any;
	error?: string;
	duration?: number;
}

interface IdentityTest {
	name: string;
	status: "idle" | "testing" | "success" | "error";
	result?: string;
	error?: string;
}

export default function TestIdentityPage() {
	const [identity, setIdentity] = useState<any>(null);
	const [refreshCount, setRefreshCount] = useState(0);
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
	]);
	const [identityTests, setIdentityTests] = useState<IdentityTest[]>([
		{ name: "Generate New Identity", status: "idle" },
		{ name: "Persist Identity", status: "idle" },
		{ name: "Retrieve Identity", status: "idle" },
		{ name: "Clear Identity", status: "idle" },
	]);

	useEffect(() => {
		const persistentIdentity = getPersistentIdentity("test-room");
		setIdentity(persistentIdentity);
		setRefreshCount((prev) => prev + 1);
	}, []);

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
			let result: any;

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

	const runIdentityTest = async (index: number) => {
		const test = identityTests[index];

		setIdentityTests((prev) =>
			prev.map((t, i) =>
				i === index
					? { ...t, status: "testing", error: undefined, result: undefined }
					: t
			)
		);

		try {
			let result = "";

			switch (test.name) {
				case "Generate New Identity":
					clearPersistentIdentity();
					const newIdentity = getPersistentIdentity("test-room");
					setIdentity(newIdentity);
					result = "New identity generated successfully";
					break;

				case "Persist Identity":
					const currentIdentity = getPersistentIdentity("test-room");
					if (currentIdentity) {
						result = "Identity persisted in localStorage";
					} else {
						throw new Error("No identity found to persist");
					}
					break;

				case "Retrieve Identity":
					const retrievedIdentity = getPersistentIdentity("test-room");
					if (retrievedIdentity) {
						result = `Identity retrieved: ${JSON.stringify(
							retrievedIdentity
						).substring(0, 50)}...`;
					} else {
						throw new Error("No identity found in localStorage");
					}
					break;

				case "Clear Identity":
					clearPersistentIdentity();
					setIdentity(null);
					result = "Identity cleared successfully";
					break;

				default:
					throw new Error("Unknown test type");
			}

			setIdentityTests((prev) =>
				prev.map((t, i) =>
					i === index ? { ...t, status: "success", result } : t
				)
			);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";

			setIdentityTests((prev) =>
				prev.map((t, i) =>
					i === index ? { ...t, status: "error", error: errorMessage } : t
				)
			);
		}
	};

	const runAllConnectionTests = async () => {
		for (let i = 0; i < connectionTests.length; i++) {
			await runConnectionTest(i);
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
	};

	const runAllIdentityTests = async () => {
		for (let i = 0; i < identityTests.length; i++) {
			await runIdentityTest(i);
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
	};

	const handleRefresh = () => {
		window.location.reload();
	};

	const handleClearAndRefresh = () => {
		clearPersistentIdentity();
		window.location.reload();
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
						✓ Passed
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

	return (
		<div className='container mx-auto px-4 py-8 max-w-6xl'>
			<div className='text-center mb-8'>
				<h1 className='text-3xl font-bold mb-4 flex items-center justify-center gap-2'>
					<TestTube className='h-8 w-8' />
					PixelCast Identity & System Test Suite
				</h1>
				<p className='text-gray-600 max-w-3xl mx-auto'>
					Comprehensive testing for persistent identity functionality and system
					connectivity. Test identity persistence, backend services, and SRS
					server integration.
				</p>
			</div>

			<div className='grid gap-6'>
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
								onClick={runAllConnectionTests}
								disabled={connectionTests.some((t) => t.status === "testing")}
							>
								<Wifi className='h-4 w-4 mr-2' />
								Run Connection Tests
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

				{/* Identity Tests */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<User className='h-5 w-5' />
							Identity Persistence Tests
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='flex gap-2 mb-4'>
							<Button
								onClick={runAllIdentityTests}
								disabled={identityTests.some((t) => t.status === "testing")}
							>
								<TestTube className='h-4 w-4 mr-2' />
								Run Identity Tests
							</Button>
						</div>

						<div className='grid gap-3'>
							{identityTests.map((test, index) => (
								<div key={test.name} className='border rounded-lg p-4'>
									<div className='flex items-center justify-between mb-2'>
										<div className='flex items-center gap-2'>
											{getStatusIcon(test.status)}
											<h3 className='font-medium'>{test.name}</h3>
										</div>
										<div className='flex items-center gap-2'>
											{getStatusBadge(test.status)}
											<Button
												size='sm'
												variant='outline'
												onClick={() => runIdentityTest(index)}
												disabled={test.status === "testing"}
											>
												Test
											</Button>
										</div>
									</div>

									{test.error && (
										<div className='text-sm text-red-600 bg-red-50 p-2 rounded'>
											❌ {test.error}
										</div>
									)}

									{test.result && (
										<div className='text-sm text-green-700 bg-green-50 p-2 rounded'>
											✅ {test.result}
										</div>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<div className='grid gap-6 md:grid-cols-2'>
					{/* Current Identity Display */}
					<div className='space-y-4'>
						<h2 className='text-xl font-semibold'>Current Identity</h2>
						<UserIdentityDisplay
							onIdentityChange={() => {
								const newIdentity = getPersistentIdentity("test-room");
								setIdentity(newIdentity);
							}}
						/>
					</div>

					{/* Manual Test Controls */}
					<div className='space-y-4'>
						<h2 className='text-xl font-semibold'>Manual Test Controls</h2>

						<Card>
							<CardHeader>
								<CardTitle className='text-lg'>Persistence Tests</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='space-y-2'>
									<Button
										onClick={handleRefresh}
										className='w-full'
										variant='outline'
									>
										<RefreshCw className='h-4 w-4 mr-2' />
										Refresh Page (Test Persistence)
									</Button>
									<p className='text-xs text-gray-600'>
										Refresh to see if your identity persists across page loads
									</p>
								</div>

								<div className='space-y-2'>
									<Button
										onClick={handleClearAndRefresh}
										className='w-full'
										variant='destructive'
									>
										Clear Identity & Refresh
									</Button>
									<p className='text-xs text-gray-600'>
										Clear stored identity and refresh to get a new one
									</p>
								</div>

								<div className='p-3 bg-blue-50 rounded border border-blue-200'>
									<div className='text-sm font-medium text-blue-800'>
										Page Load Count: {refreshCount}
									</div>
									<div className='text-xs text-blue-600 mt-1'>
										This counter resets on each page load, but identity persists
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>

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

				{/* Current Identity Info */}
				{identity && (
					<Card>
						<CardHeader>
							<CardTitle>Raw Identity Data</CardTitle>
						</CardHeader>
						<CardContent>
							<pre className='bg-gray-100 p-4 rounded text-xs overflow-auto'>
								{JSON.stringify(identity, null, 2)}
							</pre>
						</CardContent>
					</Card>
				)}

				{/* Instructions */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Eye className='h-5 w-5' />
							Testing Instructions
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-4 text-sm'>
							<div>
								<p className='font-medium'>System Connectivity Tests:</p>
								<ol className='list-decimal list-inside space-y-1 ml-4 text-gray-700'>
									<li>
										Click &quot;Run Connection Tests&quot; to verify all system
										components
									</li>
									<li>Green checkmarks indicate successful connections</li>
									<li>Red X marks indicate services that need attention</li>
									<li>Check response times to identify performance issues</li>
								</ol>
							</div>

							<div>
								<p className='font-medium'>Identity Persistence Tests:</p>
								<ol className='list-decimal list-inside space-y-1 ml-4 text-gray-700'>
									<li>
										Click &quot;Run Identity Tests&quot; to test identity
										management
									</li>
									<li>
										Tests cover generation, persistence, retrieval, and clearing
									</li>
									<li>Verify that identity survives page refreshes</li>
									<li>Test identity consistency across browser tabs</li>
								</ol>
							</div>

							<div>
								<p className='font-medium'>Manual Testing:</p>
								<ol className='list-decimal list-inside space-y-1 ml-4 text-gray-700'>
									<li>Note your current identity above</li>
									<li>Click &quot;Refresh Page&quot; to test persistence</li>
									<li>Verify your identity remains the same after refresh</li>
									<li>
										Try opening this page in a new tab - same identity should
										appear
									</li>
									<li>
										Use &quot;Clear Identity & Refresh&quot; to reset and get a
										new identity
									</li>
									<li>
										Join a room at <code>/room/test-room</code> - you&apos;ll
										have the same identity there
									</li>
								</ol>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

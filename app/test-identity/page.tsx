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
import { RefreshCw, Eye, TestTube } from "lucide-react";

export default function TestIdentityPage() {
	const [identity, setIdentity] = useState<any>(null);
	const [refreshCount, setRefreshCount] = useState(0);

	useEffect(() => {
		const persistentIdentity = getPersistentIdentity("test-room");
		setIdentity(persistentIdentity);
		setRefreshCount((prev) => prev + 1);
	}, []);

	const handleRefresh = () => {
		window.location.reload();
	};

	const handleClearAndRefresh = () => {
		clearPersistentIdentity();
		window.location.reload();
	};

	return (
		<div className='container mx-auto px-4 py-8 max-w-4xl'>
			<div className='text-center mb-8'>
				<h1 className='text-3xl font-bold mb-4 flex items-center justify-center gap-2'>
					<TestTube className='h-8 w-8' />
					Persistent Identity Test
				</h1>
				<p className='text-gray-600 max-w-2xl mx-auto'>
					This page demonstrates how PixelCast remembers your identity across
					page refreshes. Your identity is stored in localStorage and persists
					for 7 days.
				</p>
			</div>

			<div className='grid gap-6 md:grid-cols-2'>
				{/* Identity Display */}
				<div className='space-y-4'>
					<h2 className='text-xl font-semibold'>Current Identity</h2>
					<UserIdentityDisplay
						onIdentityChange={() => {
							const newIdentity = getPersistentIdentity("test-room");
							setIdentity(newIdentity);
						}}
					/>
				</div>

				{/* Test Controls */}
				<div className='space-y-4'>
					<h2 className='text-xl font-semibold'>Test Controls</h2>

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

					<Card>
						<CardHeader>
							<CardTitle className='text-lg'>How It Works</CardTitle>
						</CardHeader>
						<CardContent className='space-y-3 text-sm'>
							<div className='flex items-start gap-2'>
								<Badge variant='outline' className='text-xs'>
									1
								</Badge>
								<div>
									<strong>First Visit:</strong> A unique identity is generated
									and stored in localStorage
								</div>
							</div>
							<div className='flex items-start gap-2'>
								<Badge variant='outline' className='text-xs'>
									2
								</Badge>
								<div>
									<strong>Page Refresh:</strong> The same identity is retrieved
									from localStorage
								</div>
							</div>
							<div className='flex items-start gap-2'>
								<Badge variant='outline' className='text-xs'>
									3
								</Badge>
								<div>
									<strong>Expiration:</strong> Identity expires after 7 days of
									inactivity
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Current Identity Info */}
			{identity && (
				<div className='mt-8'>
					<h2 className='text-xl font-semibold mb-4'>Raw Identity Data</h2>
					<Card>
						<CardContent className='p-4'>
							<pre className='bg-gray-100 p-4 rounded text-xs overflow-auto'>
								{JSON.stringify(identity, null, 2)}
							</pre>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Instructions */}
			<div className='mt-8 p-6 bg-green-50 rounded-lg border border-green-200'>
				<h3 className='font-semibold text-green-800 mb-2'>
					<Eye className='h-5 w-5 inline mr-2' />
					Testing Instructions
				</h3>
				<ol className='text-sm text-green-700 space-y-1 list-decimal list-inside'>
					<li>Note your current identity above</li>
					<li>Click "Refresh Page" to test persistence</li>
					<li>Verify your identity remains the same after refresh</li>
					<li>
						Try opening this page in a new tab - same identity should appear
					</li>
					<li>
						Use "Clear Identity & Refresh" to reset and get a new identity
					</li>
					<li>
						Join a room at <code>/room/test-room</code> - you'll have the same
						identity there
					</li>
				</ol>
			</div>
		</div>
	);
}

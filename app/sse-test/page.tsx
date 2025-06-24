"use client";

import React, { useState } from "react";
import { useStreamSSE } from "@/components/SRSScreenShare/hooks/useStreamSSE";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SSETestPage() {
	const [roomName, setRoomName] = useState("test-room");
	const [isActive, setIsActive] = useState(false);

	const { streams, isConnected, error, reconnect } = useStreamSSE(
		isActive ? roomName : ""
	);

	const startTest = () => {
		setIsActive(true);
	};

	const stopTest = () => {
		setIsActive(false);
	};

	return (
		<div className='container mx-auto p-8 max-w-4xl'>
			<h1 className='text-3xl font-bold mb-8'>SSE Stream Updates Test</h1>

			<div className='space-y-6'>
				{/* Test Controls */}
				<Card>
					<CardHeader>
						<CardTitle>Test Controls</CardTitle>
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
								Connection Status
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

				{/* Instructions */}
				<Card>
					<CardHeader>
						<CardTitle>Instructions</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-2 text-sm'>
							<p>
								1. Enter a room name and click &quot;Start SSE Connection&quot;
							</p>
							<p>2. The connection status will show if SSE is working</p>
							<p>
								3. Open another tab and go to{" "}
								<code>/room/[your-room-name]</code> to start streaming
							</p>
							<p>
								4. Watch this page update in real-time when streams start/stop
							</p>
							<p>
								5. This replaces the old polling mechanism with real-time
								Server-Sent Events
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

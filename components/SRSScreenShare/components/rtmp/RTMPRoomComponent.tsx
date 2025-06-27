"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import HLSPlayer from "@/components/HLSPlayer";
import { buildApiUrlWithParams, ENDPOINTS } from "@/lib/config";
import {
	Copy,
	RefreshCw,
	ExternalLink,
	ChevronRight,
	ChevronLeft,
} from "lucide-react";
import { useStreamSSE } from "../../hooks/useStreamSSE";
import RTMPConnectionMonitor from "./RTMPConnectionMonitor";

interface RTMPStreamInfo {
	success: boolean;
	rtmpIngestUrl: string;
	hlsPlaybackUrl: string;
	flvPlaybackUrl: string;
	rtmpPlaybackUrl: string;
	app: string;
	stream: string;
}

interface StreamStatus {
	success: boolean;
	isLive: boolean;
	viewerCount: number;
	app: string;
	stream: string;
	streamInfo: any;
}

interface RTMPRoomComponentProps {
	roomName: string;
}

export default function RTMPRoomComponent({
	roomName,
}: RTMPRoomComponentProps) {
	const [rtmpInfo, setRtmpInfo] = useState<RTMPStreamInfo | null>(null);
	const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [copiedStreamKey, setCopiedStreamKey] = useState(false);
	const [srsServerUrl, setSrsServerUrl] = useState("rtmp://127.0.0.1");
	const [playerKey, setPlayerKey] = useState(Date.now());
	// Sidebar visibility state
	const [showSidebar, setShowSidebar] = useState(true);

	// Use SSE for real-time stream updates
	const { streams: sseStreams, isConnected: isSseConnected } =
		useStreamSSE(roomName);

	const fetchRTMPInfo = async () => {
		try {
			setIsLoading(true);
			setError(null);

			const response = await fetch(
				buildApiUrlWithParams(ENDPOINTS.RTMP.INGEST, {
					app: "__defaultApp__",
					stream: roomName,
				})
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: Failed to get RTMP info`);
			}

			const data: RTMPStreamInfo = await response.json();
			setRtmpInfo(data);

			// Extract SRS server from the RTMP ingest URL
			if (data.rtmpIngestUrl) {
				const url = new URL(data.rtmpIngestUrl);
				setSrsServerUrl(`rtmp://${url.hostname}`);
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to fetch RTMP info"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchStreamStatus = async () => {
		try {
			const response = await fetch(
				buildApiUrlWithParams(ENDPOINTS.RTMP.STATUS, {
					app: "__defaultApp__",
					stream: roomName,
				})
			);

			if (response.ok) {
				const data: StreamStatus = await response.json();
				setStreamStatus(data);
			}
		} catch (err) {
			console.error("Failed to fetch stream status:", err);
		}
	};

	useEffect(() => {
		fetchRTMPInfo();
		// Fetch initial status, then rely on SSE
		fetchStreamStatus();
	}, [roomName]);

	// Update status based on SSE events
	useEffect(() => {
		if (isSseConnected) {
			const currentStream = sseStreams.find((s) => s.name === roomName);
			if (currentStream) {
				const isLive = currentStream.publish?.active || false;
				const viewerCount = currentStream.clients || 0;
				setStreamStatus((prevStatus) => {
					// Avoid unnecessary re-renders if the status is the same
					if (
						prevStatus?.isLive === isLive &&
						prevStatus?.viewerCount === viewerCount
					) {
						return prevStatus;
					}
					return {
						success: true,
						isLive: isLive,
						viewerCount: viewerCount,
						app: currentStream.app,
						stream: currentStream.name,
						streamInfo: currentStream,
					};
				});
			} else if (streamStatus?.isLive) {
				// Stream was live but is now gone from SSE, so it's offline
				setStreamStatus({
					...streamStatus,
					isLive: false,
					viewerCount: 0,
				});
			}
		}
	}, [sseStreams, isSseConnected, roomName, streamStatus]);

	useEffect(() => {
		// When the stream goes live, force the HLS player to update by changing its key
		if (streamStatus?.isLive) {
			setPlayerKey(Date.now());
		}
	}, [streamStatus?.isLive]);

	const copyToClipboard = async (text: string, isStreamKey = false) => {
		try {
			await navigator.clipboard.writeText(text);
			if (isStreamKey) {
				setCopiedStreamKey(true);
				setTimeout(() => setCopiedStreamKey(false), 2000);
			} else {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			}
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	const handleRefresh = () => {
		fetchRTMPInfo();
		fetchStreamStatus();
	};

	if (isLoading) {
		return (
			<div className='flex items-center justify-center min-h-[50vh]'>
				<div className='text-center'>
					<Spinner className='mx-auto mb-4' />
					<p className='text-lg font-medium'>Loading RTMP Stream...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='flex items-center justify-center min-h-[50vh]'>
				<div className='text-center'>
					<div className='mb-4'>
						<Badge variant='destructive'>Error</Badge>
					</div>
					<p className='text-lg font-medium mb-2'>Failed to Load Stream</p>
					<p className='text-sm text-gray-600 mb-4'>{error}</p>
					<Button onClick={handleRefresh}>Try Again</Button>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gray-50 p-4'>
			<div className='max-w-6xl mx-auto'>
				{/* Header */}
				<div className='mb-6'>
					<div className='flex items-center justify-between'>
						<div>
							<h1 className='text-3xl font-bold text-gray-900'>
								RTMP Stream: {roomName}
							</h1>
							<p className='text-gray-600 mt-2'>
								Stream to RTMP, watch via HLS. Status is updated in real-time.
							</p>
						</div>
						<div className='flex items-center space-x-2'>
							<Button
								variant='outline'
								size='icon'
								onClick={handleRefresh}
								title='Refresh'
							>
								<RefreshCw className='h-4 w-4' />
							</Button>
						</div>
					</div>
				</div>

				<div className='relative flex flex-col lg:flex-row gap-6'>
					{/* Main Content (Player) */}
					<div className='flex-1'>
						<Card>
							<CardHeader>
								<CardTitle>Live Stream Player</CardTitle>
							</CardHeader>
							<CardContent>
								<div className='aspect-video bg-black rounded-lg overflow-hidden'>
									<HLSPlayer
										key={playerKey}
										app='__defaultApp__'
										stream={roomName}
										className='w-full h-full'
										autoplay={true}
										controls={true}
										muted={false}
									/>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Sidebar */}
					{showSidebar && (
						<div className='relative w-full lg:w-96 flex-shrink-0 space-y-6'>
							{/* Floating collapse button - desktop */}
							<div className='absolute -left-6 top-1/2 -translate-y-1/2 z-50 hidden lg:block'>
								<Button
									variant='outline'
									size='sm'
									onClick={() => setShowSidebar(false)}
									className='bg-white hover:bg-gray-50 border-black text-black shadow-lg cursor-pointer'
								>
									<ChevronRight className='h-4 w-4' />
								</Button>
							</div>

							{/* Mobile collapse button */}
							<div className='absolute -top-2 -right-2 z-50 lg:hidden'>
								<Button
									variant='outline'
									size='sm'
									onClick={() => setShowSidebar(false)}
									className='bg-white hover:bg-gray-50 border-black text-black shadow-lg cursor-pointer'
								>
									<ChevronRight className='h-4 w-4' />
								</Button>
							</div>

							<Card>
								<CardHeader>
									<CardTitle>Stream Configuration</CardTitle>
								</CardHeader>
								<CardContent className='space-y-4'>
									{/* RTMP Server URL */}
									<div>
										<Label htmlFor='rtmp-server'>RTMP Server</Label>
										<div className='flex mt-1'>
											<Input
												id='rtmp-server'
												value={srsServerUrl}
												readOnly
												className='font-mono text-sm'
											/>
											<Button
												variant='outline'
												size='icon'
												className='ml-2'
												onClick={() => copyToClipboard(srsServerUrl)}
												title='Copy to clipboard'
											>
												<Copy className='h-4 w-4' />
											</Button>
										</div>
										{copied && (
											<p className='text-sm text-green-600 mt-1'>
												Copied to clipboard!
											</p>
										)}
									</div>

									{/* Stream Key */}
									<div>
										<Label htmlFor='stream-key'>Stream Key</Label>
										<div className='flex mt-1'>
											<Input
												id='stream-key'
												value={roomName}
												readOnly
												className='font-mono text-sm'
											/>
											<Button
												variant='outline'
												size='icon'
												className='ml-2'
												onClick={() => copyToClipboard(roomName, true)}
												title='Copy stream key to clipboard'
											>
												<Copy className='h-4 w-4' />
											</Button>
										</div>
										{copiedStreamKey && (
											<p className='text-sm text-green-600 mt-1'>
												Stream key copied!
											</p>
										)}
									</div>

									{/* Instructions */}
									<div className='pt-4 border-t'>
										<h4 className='font-medium mb-2'>How to Stream</h4>
										<ol className='text-sm text-gray-600 space-y-1'>
											<li>
												1. Copy the RTMP Server URL: <code>{srsServerUrl}</code>
											</li>
											<li>
												2. Copy the Stream Key: <code>{roomName}</code>
											</li>
											<li>3. In OBS or your streaming software:</li>
											<li>
												&nbsp;&nbsp;&nbsp;• Set Server to the RTMP Server URL
											</li>
											<li>
												&nbsp;&nbsp;&nbsp;• Set Stream Key to the copied key
											</li>
											<li>4. Start streaming!</li>
											<li>5. Your stream will appear in the player.</li>
										</ol>
									</div>

									{/* External Links */}
									<div className='pt-4 border-t'>
										<h4 className='font-medium mb-2'>External Tools</h4>
										<div className='space-y-2'>
											<Button
												variant='outline'
												size='sm'
												className='w-full justify-start'
												onClick={() =>
													window.open("https://obsproject.com/", "_blank")
												}
											>
												<ExternalLink className='h-4 w-4 mr-2' />
												Download OBS Studio
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* RTMP Connection Monitor */}
							<RTMPConnectionMonitor
								roomName={roomName}
								app='__defaultApp__'
								isActive={true}
							/>
						</div>
					)}

					{/* Expand sidebar button when hidden */}
					{!showSidebar && (
						<div className='absolute right-0 top-1/2 -translate-y-1/2 z-50'>
							<Button
								variant='outline'
								size='sm'
								onClick={() => setShowSidebar(true)}
								className='bg-white hover:bg-gray-50 border-black text-black shadow-lg cursor-pointer'
							>
								<ChevronLeft className='h-4 w-4' />
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

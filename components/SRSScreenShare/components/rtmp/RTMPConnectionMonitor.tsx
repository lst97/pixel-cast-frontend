"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server, Activity, Users } from "lucide-react";
import { buildApiUrlWithParams, ENDPOINTS } from "@/lib/config";
import { SRSMonitorData } from "@/lib/types";

interface ConnectionMetrics extends SRSMonitorData {
	lastUpdated: number;
}

interface RTMPConnectionMonitorProps {
	roomName: string;
	app?: string;
	isActive?: boolean;
	className?: string;
}

export default function RTMPConnectionMonitor({
	roomName,
	app = "__defaultApp__",
	isActive = true,
	className = "",
}: RTMPConnectionMonitorProps) {
	const [metrics, setMetrics] = useState<Partial<ConnectionMetrics>>({
		isConnected: false,
		serverVersion: "Unknown",
		lastUpdated: 0,
	});

	const [isMonitoring, setIsMonitoring] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const collectMetrics = async () => {
		try {
			setError(null);
			const response = await fetch(
				buildApiUrlWithParams(ENDPOINTS.SRS_PROXY.MONITOR, {
					app,
					roomName,
				})
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch monitor data: ${response.status}`);
			}

			const data: SRSMonitorData = await response.json();

			setMetrics({ ...data, lastUpdated: Date.now() });

			console.log("📊 RTMP Connection Monitor updated:", {
				isConnected: data.isConnected,
				serverVersion: data.serverVersion,
				streamFound: !!data.streamInfo,
			});
		} catch (err) {
			console.error("Error collecting RTMP metrics:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
			setMetrics((prev) => ({
				...prev,
				isConnected: false,
				lastUpdated: Date.now(),
			}));
		}
	};

	useEffect(() => {
		if (!isActive) {
			setIsMonitoring(false);
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
			return;
		}

		setIsMonitoring(true);

		// Initial fetch
		collectMetrics();

		// Set up polling interval
		intervalRef.current = setInterval(collectMetrics, 15000); // Every 15 seconds

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [isActive, roomName, app]);

	const formatUptime = (seconds: number): string => {
		if (!seconds || seconds < 0) return "N/A";
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (days > 0) return `${days}d ${hours}h ${minutes}m`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	};

	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
	};

	const getConnectionStatus = () => {
		if (!metrics.isConnected)
			return { label: "Disconnected", color: "bg-red-600" };
		if (error) return { label: "Error", color: "bg-orange-600" };
		if (metrics.streamInfo?.publish?.active)
			return { label: "Live", color: "bg-green-600" };
		return { label: "Connected", color: "bg-blue-600" };
	};

	const getPerformanceStatus = (
		value: number,
		thresholds: [number, number]
	) => {
		if (value < thresholds[0]) return "bg-green-600";
		if (value < thresholds[1]) return "bg-yellow-600";
		return "bg-red-600";
	};

	if (!isMonitoring) {
		return (
			<Card className={`w-full max-w-md border-black bg-white ${className}`}>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-black'>
						<Server className='h-5 w-5' />
						RTMP Connection Monitor
						<Badge variant='outline' className='border-gray-400 text-gray-600'>
							Inactive
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className='text-sm text-gray-600'>
						Monitor is inactive. Enable to view connection status.
					</p>
				</CardContent>
			</Card>
		);
	}

	const connectionStatus = getConnectionStatus();

	return (
		<Card className={`w-full max-w-md border-black bg-white ${className}`}>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-black'>
					<Server className='h-5 w-5' />
					RTMP Connection Monitor
					<Badge
						variant='outline'
						className={`${connectionStatus.color} text-white border-none`}
					>
						{connectionStatus.label}
					</Badge>
					<Button
						variant='outline'
						size='sm'
						onClick={collectMetrics}
						className='ml-auto'
						title='Refresh metrics'
					>
						<RefreshCw className='h-4 w-4' />
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Server Information */}
				<div className='space-y-3'>
					<div className='flex items-center gap-2'>
						<Badge variant='outline' className='border-blue-600 text-blue-600'>
							<Activity className='h-3 w-3 mr-1' />
							Server Info
						</Badge>
					</div>

					<div className='grid grid-cols-2 gap-3 text-xs'>
						<div className='flex flex-col'>
							<span className='text-gray-600'>Version</span>
							<span className='font-mono text-black'>
								{metrics.serverVersion}
							</span>
						</div>
						<div className='flex flex-col'>
							<span className='text-gray-600'>Uptime</span>
							<span className='font-mono text-black'>
								{metrics.serverUptime
									? formatUptime(metrics.serverUptime)
									: "N/A"}
							</span>
						</div>
						<div className='flex flex-col'>
							<span className='text-gray-600'>Total Streams</span>
							<span className='font-mono text-black'>
								{metrics.streamCount ?? "N/A"}
							</span>
						</div>
						<div className='flex flex-col'>
							<span className='text-gray-600'>Total Clients</span>
							<span className='font-mono text-black'>
								{metrics.totalClients ?? "N/A"}
							</span>
						</div>
					</div>
				</div>

				{/* System Performance */}
				<div className='border-t border-gray-300 pt-3 space-y-3'>
					<div className='flex items-center gap-2'>
						<Badge
							variant='outline'
							className='border-purple-600 text-purple-600'
						>
							📊 System Performance
						</Badge>
					</div>

					<div className='space-y-2'>
						<div className='flex justify-between items-center text-xs'>
							<span className='text-gray-600'>CPU Usage</span>
							<div className='flex items-center gap-2'>
								<Badge
									className={`${getPerformanceStatus(
										metrics.cpuUsage ?? 0,
										[50, 80]
									)} text-white text-xs`}
								>
									{(metrics.cpuUsage ?? 0).toFixed(1)}%
								</Badge>
							</div>
						</div>
						<div className='flex justify-between items-center text-xs'>
							<span className='text-gray-600'>Memory Usage</span>
							<div className='flex items-center gap-2'>
								<Badge
									className={`${getPerformanceStatus(
										metrics.memoryUsage ?? 0,
										[70, 90]
									)} text-white text-xs`}
								>
									{(metrics.memoryUsage ?? 0).toFixed(1)}%
								</Badge>
							</div>
						</div>
						<div className='flex justify-between items-center text-xs'>
							<span className='text-gray-600'>Disk I/O</span>
							<div className='flex items-center gap-2'>
								<Badge
									className={`${getPerformanceStatus(
										metrics.diskUsage ?? 0,
										[50, 80]
									)} text-white text-xs`}
								>
									{(metrics.diskUsage ?? 0).toFixed(1)}%
								</Badge>
							</div>
						</div>
						<div className='flex justify-between items-center text-xs'>
							<span className='text-gray-600'>Load Average</span>
							<span className='font-mono text-black'>
								{metrics.loadAverage?.map((l) => l.toFixed(2)).join(", ") ??
									"N/A"}
							</span>
						</div>
					</div>
				</div>

				{/* Stream-Specific Information */}
				{metrics.streamInfo && (
					<div className='border-t border-gray-300 pt-3 space-y-3'>
						<div className='flex items-center gap-2'>
							<Badge
								variant='outline'
								className='border-green-600 text-green-600'
							>
								<Users className='h-3 w-3 mr-1' />
								Stream: {roomName}
							</Badge>
						</div>

						<div className='grid grid-cols-2 gap-3 text-xs'>
							<div className='flex flex-col'>
								<span className='text-gray-600'>Status</span>
								<span
									className={`font-mono ${
										metrics.streamInfo.publish?.active
											? "text-green-600"
											: "text-gray-600"
									}`}
								>
									{metrics.streamInfo.publish?.active ? "Live" : "Offline"}
								</span>
							</div>
							<div className='flex flex-col'>
								<span className='text-gray-600'>Viewers</span>
								<span className='font-mono text-black'>
									{metrics.streamInfo.clients}
								</span>
							</div>
							<div className='flex flex-col'>
								<span className='text-gray-600'>Inbound</span>
								<span className='font-mono text-black'>
									{metrics.streamInfo.kbps?.recv_30s ?? 0} kbps
								</span>
							</div>
							<div className='flex flex-col'>
								<span className='text-gray-600'>Outbound</span>
								<span className='font-mono text-black'>
									{metrics.streamInfo.kbps?.send_30s ?? 0} kbps
								</span>
							</div>
						</div>

						{/* Video/Audio Info */}
						{(metrics.streamInfo.video || metrics.streamInfo.audio) && (
							<div className='border-t border-gray-200 pt-2 space-y-2'>
								{metrics.streamInfo.video && (
									<div className='flex justify-between text-xs'>
										<span className='text-gray-600'>Video</span>
										<span className='font-mono text-black'>
											{metrics.streamInfo.video.width}x
											{metrics.streamInfo.video.height}{" "}
											{metrics.streamInfo.video.codec}
										</span>
									</div>
								)}
								{metrics.streamInfo.audio && (
									<div className='flex justify-between text-xs'>
										<span className='text-gray-600'>Audio</span>
										<span className='font-mono text-black'>
											{metrics.streamInfo.audio.codec}{" "}
											{metrics.streamInfo.audio.sample_rate}Hz
										</span>
									</div>
								)}
								<div className='flex justify-between text-xs'>
									<span className='text-gray-600'>Live Duration</span>
									<span className='font-mono text-black'>
										{metrics.now_ms && metrics.streamInfo.live_ms
											? formatUptime(
													Math.floor(
														(metrics.now_ms - metrics.streamInfo.live_ms) / 1000
													)
											  )
											: "N/A"}
									</span>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Error Display */}
				{error && (
					<div className='border-t border-gray-300 pt-3'>
						<div className='text-xs text-red-600 font-medium'>
							⚠️ Connection Issues
						</div>
						<p className='text-xs text-gray-600 mt-1'>{error}</p>
					</div>
				)}

				{/* Status Footer */}
				<div className='border-t border-gray-300 pt-3'>
					<div className='flex justify-between items-center text-xs'>
						<span className='text-gray-600'>Last Updated</span>
						<span className='font-mono text-black'>
							{metrics.lastUpdated
								? new Date(metrics.lastUpdated).toLocaleTimeString()
								: "N/A"}
						</span>
					</div>
					<div className='flex flex-wrap gap-1 mt-2'>
						<Badge
							variant='outline'
							className='text-xs border-black text-black'
						>
							SRS v{metrics.serverVersion}
						</Badge>
						<Badge
							variant='outline'
							className='text-xs border-black text-black'
						>
							RTMP/HLS
						</Badge>
						{metrics.streamInfo?.publish?.active && (
							<Badge
								variant='outline'
								className='text-xs border-green-600 text-green-600'
							>
								Broadcasting
							</Badge>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

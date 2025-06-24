"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Users, Monitor, Eye, ChevronRight } from "lucide-react";
import LatencyMonitor from "@/components/SRSScreenShare/components/LatencyMonitor";
import { Participant, SRSConfig } from "../types";
import { UserIdentityDisplay } from "../../UserIdentityDisplay";

interface ParticipantsSidebarProps {
	setShowParticipants: (show: boolean) => void;
	config: SRSConfig;
	isSharing: boolean;
	participants: Participant[];
	viewers: Set<string>;
	resolution: string;
	frameRate: number;
	publishPeerConnection: RTCPeerConnection | null;
	subscribePeerConnections: Map<string, RTCPeerConnection>;
	remoteStreams: Map<string, MediaStream>;
}

export const ParticipantsSidebar: React.FC<ParticipantsSidebarProps> = ({
	setShowParticipants,
	config,
	isSharing,
	participants,
	viewers,
	resolution,
	frameRate,
	publishPeerConnection,
	subscribePeerConnections,
	remoteStreams,
}) => {
	const activeSharingParticipants = participants.filter((p) => p.isSharing);
	const totalParticipants =
		activeSharingParticipants.length + (isSharing ? 1 : 0);

	// Truncate room name if too long
	const truncateRoomName = (name: string, maxLength: number = 20) => {
		return name.length > maxLength
			? `${name.substring(0, maxLength)}...`
			: name;
	};

	return (
		<>
			{/* Floating collapse button - positioned between video and sidebar */}
			<div className='absolute -left-6 top-1/2 -translate-y-1/2 z-50 hidden md:block'>
				<Button
					variant='outline'
					size='sm'
					onClick={() => setShowParticipants(false)}
					className='bg-white hover:bg-gray-50 border-black text-black shadow-lg cursor-pointer'
				>
					<ChevronRight className='h-4 w-4' />
				</Button>
			</div>

			{/* Mobile collapse button - positioned at top right of sidebar */}
			<div className='absolute -top-2 -right-2 z-50 md:hidden'>
				<Button
					variant='outline'
					size='sm'
					onClick={() => setShowParticipants(false)}
					className='bg-white hover:bg-gray-50 border-black text-black shadow-lg cursor-pointer'
				>
					<ChevronRight className='h-4 w-4' />
				</Button>
			</div>

			<div className='w-full md:w-80 space-y-4'>
				{/* Ultra-Low Latency Monitor */}
				<LatencyMonitor
					publishPeerConnection={publishPeerConnection}
					subscribePeerConnections={subscribePeerConnections}
					videoElement={
						remoteStreams.size > 0
							? (document.querySelector("video[autoplay]") as HTMLVideoElement)
							: null
					}
					isActive={isSharing || remoteStreams.size > 0}
					isSharing={isSharing}
				/>

				{/* User Identity Display */}
				<UserIdentityDisplay />

				<Card className='border-black'>
					<CardHeader>
						<CardTitle className='flex items-center justify-between text-black'>
							<div className='flex items-center gap-2'>
								<Users className='h-4 w-4' />
								Room Participants
							</div>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-4'>
							{/* Room info with truncated name and tooltip */}
							<div className='p-3 bg-gray-100 rounded-lg border border-gray-300'>
								<div className='text-sm font-medium text-black'>
									<Tooltip content={config.roomName}>
										<span className='cursor-help'>
											Room: {truncateRoomName(config.roomName)}
										</span>
									</Tooltip>
								</div>
								<div className='text-xs text-gray-600'>
									Your identity: {config.identity}
								</div>
							</div>

							{/* Current user - only show if sharing or watching streams */}
							{(isSharing || activeSharingParticipants.length > 0) && (
								<div className='flex items-center justify-between p-2 bg-gray-100 rounded-lg border border-gray-300'>
									<div className='flex items-center gap-2'>
										<Monitor className='h-4 w-4 text-black' />
										<span className='text-sm font-medium text-black'>You</span>
									</div>
									<Badge
										variant={isSharing ? "default" : "secondary"}
										className={
											isSharing
												? "bg-black text-white"
												: "bg-gray-200 text-black"
										}
									>
										{isSharing ? "Sharing" : "Watching"}
									</Badge>
								</div>
							)}

							{/* Publishers (other participants sharing) */}
							{activeSharingParticipants.length > 0 && (
								<div className='space-y-2'>
									<div className='text-sm font-medium text-black'>
										Publishers
									</div>
									{activeSharingParticipants.map((participant) => (
										<div
											key={participant.identity}
											className='flex items-center justify-between p-2 border border-gray-300 rounded-lg'
										>
											<div className='flex items-center gap-2'>
												<Monitor className='h-4 w-4 text-black' />
												<span className='text-sm text-black'>
													{participant.name}
												</span>
											</div>
											<Badge variant='default' className='bg-black text-white'>
												Sharing
											</Badge>
										</div>
									))}
								</div>
							)}

							{/* Viewers (people just watching) */}
							{viewers.size > 0 && (
								<div className='space-y-2'>
									<div className='text-sm font-medium text-black'>
										Viewers ({viewers.size})
									</div>
									{Array.from(viewers).map((viewer) => (
										<div
											key={viewer}
											className='flex items-center justify-between p-2 border border-gray-300 rounded-lg'
										>
											<div className='flex items-center gap-2'>
												<Eye className='h-4 w-4 text-black' />
												<span className='text-sm text-black'>{viewer}</span>
											</div>
											<Badge
												variant='secondary'
												className='bg-gray-200 text-black'
											>
												Watching
											</Badge>
										</div>
									))}
								</div>
							)}

							{/* Empty state - show when no one is sharing and no viewers */}
							{activeSharingParticipants.length === 0 &&
								viewers.size === 0 &&
								!isSharing && (
									<div className='text-center py-4 text-gray-500'>
										<Users className='h-8 w-8 mx-auto mb-2 opacity-50' />
										<p className='text-sm'>No participants sharing yet</p>
										<p className='text-xs mt-1'>
											Start sharing to begin the session
										</p>
									</div>
								)}

							{/* Connection stats */}
							<div className='pt-4 border-t border-gray-300 space-y-2'>
								<div className='text-sm font-medium text-black'>
									Connection Stats
								</div>
								<div className='text-xs text-gray-600'>
									Publishers: {totalParticipants}
								</div>
								<div className='text-xs text-gray-600'>
									Viewers: {viewers.size}
								</div>
								{isSharing && (
									<div className='text-xs text-gray-600'>
										Resolution: {resolution} @ {frameRate}fps
									</div>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</>
	);
};

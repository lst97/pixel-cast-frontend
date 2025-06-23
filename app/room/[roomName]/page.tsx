"use client";

import React, { Suspense } from "react";
import LiveKitRoomWrapper from "@/components/LiveKitRoomWrapper";

interface RoomPageProps {
	params: Promise<{ roomName: string }>;
	searchParams: Promise<{ username?: string }>;
}

export default function RoomPage({ params, searchParams }: RoomPageProps) {
	return (
		<Suspense
			fallback={
				<div className='flex items-center justify-center min-h-screen'>
					Loading room...
				</div>
			}
		>
			<RoomPageContent params={params} searchParams={searchParams} />
		</Suspense>
	);
}

function RoomPageContent({ params, searchParams }: RoomPageProps) {
	const [resolvedParams, resolvedSearchParams] = [
		React.use(params),
		React.use(searchParams),
	];

	const roomName = resolvedParams.roomName;

	// Generate a unique username if none provided
	const username = React.useMemo(() => {
		if (resolvedSearchParams.username) {
			return resolvedSearchParams.username;
		}
		// Generate unique ID using timestamp + random number
		const uniqueId =
			Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
		return `Guest-${uniqueId}`;
	}, [resolvedSearchParams.username]);

	return (
		<div className='container mx-auto px-4 py-4'>
			<LiveKitRoomWrapper roomName={roomName} username={username} />
		</div>
	);
}

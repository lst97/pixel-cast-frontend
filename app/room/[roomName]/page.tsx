"use client";

import React from "react";
import SRSRoomWrapper from "@/components/SRSRoomWrapper";
import { getPersistentIdentity } from "@/lib/persistentIdentity";

interface RoomPageProps {
	params: Promise<{
		roomName: string;
	}>;
}

export default function RoomPage(props: RoomPageProps) {
	return <RoomPageContent params={props.params} />;
}

function RoomPageContent({ params }: RoomPageProps) {
	const resolvedParams = React.use(params);
	const roomName = resolvedParams.roomName;

	// Use persistent identity that remembers the user across page refreshes
	const userIdentity = React.useMemo(() => {
		const persistentIdentity = getPersistentIdentity(roomName);
		console.log(
			`🔄 Room ${roomName}: Using persistent identity ${persistentIdentity.identity} (${persistentIdentity.displayName})`
		);
		return persistentIdentity;
	}, [roomName]); // Only recalculate if room changes

	return (
		<div className='container mx-auto px-4 py-4'>
			<SRSRoomWrapper
				roomName={roomName}
				username={userIdentity.identity}
				displayName={userIdentity.displayName}
			/>
		</div>
	);
}

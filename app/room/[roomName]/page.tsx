"use client";

import React, { useState, useEffect } from "react";
import SRSRoomWrapper from "@/components/SRSRoomWrapper";
import { getPersistentIdentity } from "@/lib/persistentIdentity";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { buildApiUrlWithParams, ENDPOINTS } from "@/lib/config";
import RTMPRoomComponent from "@/components/SRSScreenShare/components/rtmp/RTMPRoomComponent";

interface RoomPageProps {
	params: Promise<{
		roomName: string;
	}>;
}

export default function RoomPage(props: RoomPageProps) {
	return <RoomPageContent params={props.params} />;
}

interface RoomData {
	id: string;
	name: string;
	streamKey: string;
	type: "rtmp" | "webrtc";
	roomUrl: string;
	createdAt: string;
}

function RoomPageContent({ params }: RoomPageProps) {
	const resolvedParams = React.use(params);
	const roomName = resolvedParams.roomName;

	const [roomExists, setRoomExists] = useState<boolean | null>(null);
	const [roomData, setRoomData] = useState<RoomData | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Use persistent identity that remembers the user across page refreshes
	const userIdentity = React.useMemo(() => {
		const persistentIdentity = getPersistentIdentity(roomName);
		console.log(
			`🔄 Room ${roomName}: Using persistent identity ${persistentIdentity.identity} (${persistentIdentity.displayName})`
		);
		return persistentIdentity;
	}, [roomName]); // Only recalculate if room changes

	const validateRoom = async () => {
		try {
			const response = await fetch(
				buildApiUrlWithParams(ENDPOINTS.ROOMS.VALIDATE, {
					roomUrl: `/room/${roomName}`,
				})
			);

			if (response.ok) {
				const data = await response.json();
				setRoomExists(data.exists);
				if (data.exists && data.room) {
					setRoomData(data.room);
				}
			} else {
				setRoomExists(false);
			}
		} catch (err) {
			console.error("Failed to validate room:", err);
			setRoomExists(false);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		validateRoom();
	}, [roomName]);

	if (isLoading) {
		return (
			<div className='min-h-screen bg-gray-50 p-4'>
				<div className='max-w-6xl mx-auto'>
					<div className='flex items-center justify-center min-h-[50vh]'>
						<div className='text-center'>
							<Spinner className='mx-auto mb-4' />
							<p className='text-lg font-medium'>Loading Room...</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (roomExists === false) {
		return (
			<div className='min-h-screen bg-gray-50 p-4'>
				<div className='max-w-6xl mx-auto'>
					<div className='flex items-center justify-center min-h-[50vh]'>
						<div className='text-center'>
							<div className='mb-4'>
								<div className='text-6xl mb-4'>🚫</div>
								<h1 className='text-3xl font-bold text-gray-900 mb-2'>
									Room Not Found
								</h1>
								<p className='text-lg text-gray-600 mb-4'>
									The room "{roomName}" does not exist.
								</p>
								<p className='text-sm text-gray-500 mb-6'>
									This room may have been deleted or the URL is incorrect.
								</p>
								<Button
									onClick={() => (window.location.href = "/")}
									className='bg-blue-600 hover:bg-blue-700'
								>
									← Go Home
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Render the appropriate component based on room type
	if (roomData?.type === "rtmp") {
		return <RTMPRoomComponent roomName={roomName} />;
	} else {
		// Default to WebRTC for backward compatibility
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
}

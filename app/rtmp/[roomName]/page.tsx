"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { buildApiUrlWithParams, ENDPOINTS } from "@/lib/config";
import RTMPRoomComponent from "@/components/SRSScreenShare/components/rtmp/RTMPRoomComponent";

export default function RTMPStreamPage() {
	const params = useParams();
	const roomName = params.roomName as string;

	const [roomExists, setRoomExists] = useState<boolean | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const validateRoom = useCallback(async () => {
		try {
			const response = await fetch(
				buildApiUrlWithParams(ENDPOINTS.ROOMS.VALIDATE, {
					roomUrl: `/room/${roomName}`,
				})
			);

			if (response.ok) {
				const data = await response.json();
				setRoomExists(data.exists);
				return data.exists;
			} else {
				setRoomExists(false);
				return false;
			}
		} catch (err) {
			console.error("Failed to validate room:", err);
			setRoomExists(false);
			return false;
		}
	}, [roomName]);

	useEffect(() => {
		const initializeRoom = async () => {
			const exists = await validateRoom();
			setIsLoading(false);
		};

		initializeRoom();
	}, [roomName, validateRoom]);

	if (isLoading) {
		return (
			<div className='min-h-screen bg-gray-50 p-4'>
				<div className='max-w-6xl mx-auto'>
					<div className='flex items-center justify-center min-h-[50vh]'>
						<div className='text-center'>
							<Spinner className='mx-auto mb-4' />
							<p className='text-lg font-medium'>Loading RTMP Stream...</p>
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
									The RTMP room &quot;{roomName}&quot; does not exist.
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

	// Room exists, render the RTMP component
	return <RTMPRoomComponent roomName={roomName} />;
}

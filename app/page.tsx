"use client";

import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
	const router = useRouter();

	const handleCreateRoom = () => {
		// Generate a unique room ID
		const roomId = uuidv4();

		// Generate a guest username with timestamp for uniqueness
		const guestUsername = `Guest-${Date.now().toString(36)}${Math.random()
			.toString(36)
			.substr(2, 5)}`;

		router.push(
			`/room/${roomId}?username=${encodeURIComponent(guestUsername)}`
		);
	};

	return (
		<div className='container mx-auto px-4 py-8 min-h-[calc(100vh-80px)] flex items-center justify-center'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle className='text-center'>PixelCast</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='text-center space-y-4'>
						<div className='text-6xl mb-4'>🎥</div>
						<h2 className='text-xl font-semibold'>Ready to start?</h2>
						<p className='text-muted-foreground'>
							Create a new room and start your video conference instantly.
							You&apos;ll join as a guest user with camera and microphone
							disabled by default.
						</p>
					</div>
				</CardContent>
				<CardFooter>
					<Button
						onClick={handleCreateRoom}
						className='w-full bg-green-600 hover:bg-green-700'
						size='lg'
					>
						Create Room
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}

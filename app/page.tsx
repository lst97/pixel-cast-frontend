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

		router.push(`/room/${roomId}`);
	};

	return (
		<div className='container mx-auto px-4 py-8 min-h-[calc(100vh-80px)] flex items-center justify-center'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle className='text-center'>PixelCast</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='text-center space-y-4'>
						<div className='text-6xl mb-4'>🖥️</div>
						<h2 className='text-xl font-semibold'>
							Ready to Share Your Screen?
						</h2>
						<p className='text-muted-foreground'>
							Create a new room and start sharing your screen instantly. Perfect
							for presentations, demos, and collaboration.
						</p>
					</div>
				</CardContent>
				<CardFooter>
					<Button
						onClick={handleCreateRoom}
						className='w-full bg-blue-600 hover:bg-blue-700'
						size='lg'
					>
						Start Screen Sharing
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}

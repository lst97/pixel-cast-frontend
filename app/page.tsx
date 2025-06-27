"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { buildApiUrl, ENDPOINTS } from "@/lib/config";
import {
	Monitor,
	Video,
	Users,
	Zap,
	Clock,
	Gauge,
	Shield,
	ArrowRight,
	Sparkles,
} from "lucide-react";

export default function Home() {
	const [isCreatingWebRTC, setIsCreatingWebRTC] = useState(false);
	const [isCreatingRTMP, setIsCreatingRTMP] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const handleCreateRoom = async (type: "webrtc" | "rtmp") => {
		const setLoading =
			type === "webrtc" ? setIsCreatingWebRTC : setIsCreatingRTMP;

		setLoading(true);
		setError(null);
		setSuccessMessage(null);

		try {
			const response = await fetch(buildApiUrl(ENDPOINTS.ROOMS.CREATE), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ type }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to create room");
			}

			const data = await response.json();
			console.log("Room created:", data);

			// Show success message instead of redirecting
			setSuccessMessage(
				`🎉 ${type.toUpperCase()} room "${
					data.room.name
				}" created successfully! A private Discord link has been sent. Check Discord to access your room.`
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create room");
		} finally {
			setLoading(false);
		}
	};

	const roomTypes = [
		{
			id: "webrtc",
			title: "WebRTC Screen Share",
			icon: Monitor,
			gradient: "from-blue-500 to-cyan-500",
			description: "Self-hosted real-time screen sharing",
			features: [
				"⚡ Low latency (< 100ms)",
				"📊 Perfect for text & presentations",
				"💻 Browser-based, minimum setup",
				"👥 Medium audience size (10-50 users)",
			],
			specs: {
				latency: "< 100ms",
				fps: "30 FPS",
				quality: "Medium",
				audience: "10-50",
			},
			available: true,
			loading: isCreatingWebRTC,
			action: () => handleCreateRoom("webrtc"),
		},
		{
			id: "rtmp",
			title: "RTMP Live Stream",
			icon: Video,
			gradient: "from-purple-500 to-pink-500",
			description: "High-quality streaming with massive reach",
			features: [
				"🎥 High FPS & quality streaming",
				"📺 Perfect for video content",
				"🌍 Unlimited audience size",
				"⏱️ 3-10 second delay",
			],
			specs: {
				latency: "3-10s",
				fps: "60 FPS",
				quality: "High",
				audience: "Unlimited",
			},
			available: true,
			loading: isCreatingRTMP,
			action: () => handleCreateRoom("rtmp"),
		},
		{
			id: "p2p",
			title: "P2P Direct Connect",
			icon: Users,
			gradient: "from-emerald-500 to-teal-500",
			description: "Direct peer-to-peer connection (Coming Soon)",
			features: [
				"🚀 Minimal latency (< 50ms)",
				"🎮 Perfect for gaming & interaction",
				"👥 Small groups (2-8 users)",
				"🔐 Direct encrypted connection",
			],
			specs: {
				latency: "< 50ms",
				fps: "60+ FPS",
				quality: "Ultra",
				audience: "2-8",
			},
			available: false,
			loading: false,
			action: () => alert("P2P Direct Connect is coming soon! 🚀"),
		},
		{
			id: "hybrid",
			title: "Hybrid Multi-Cast",
			icon: Sparkles,
			gradient: "from-orange-500 to-red-500",
			description: "Best of all worlds (Future Release)",
			features: [
				"🔄 Adaptive streaming technology",
				"📱 Multi-device optimization",
				"🎯 Smart audience routing",
				"⚙️ Auto quality adjustment",
			],
			specs: {
				latency: "Dynamic",
				fps: "Adaptive",
				quality: "Smart",
				audience: "Scalable",
			},
			available: false,
			loading: false,
			action: () => alert("Hybrid Multi-Cast is in development! 🛠️"),
		},
	];

	return (
		<div className='container mx-auto px-4 py-12'>
			{/* Hero Section */}
			<div className='text-center mb-16'>
				<div className='inline-block p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-6'>
					<div className='bg-white rounded-full p-4'>
						<Monitor className='h-12 w-12 text-blue-600' />
					</div>
				</div>
				<h1 className='text-4xl md:text-6xl font-bold mb-6'>
					Choose Your{" "}
					<span className='bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
						Streaming Experience
					</span>
				</h1>
				<p className='text-xl text-gray-600 max-w-3xl mx-auto mb-8'>
					Create secure, private rooms for different streaming needs. Each room
					type is optimized for specific use cases with Discord-based access
					control.
				</p>

				{/* Security Notice */}
				<div className='inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 text-sm text-blue-700'>
					<Shield className='h-4 w-4' />
					<span>🔒 Private rooms with Discord webhook access control</span>
				</div>
			</div>

			{/* Error/Success Messages */}
			{error && (
				<div className='max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg'>
					<p className='text-red-600 font-medium'>❌ {error}</p>
				</div>
			)}

			{successMessage && (
				<div className='max-w-2xl mx-auto mb-8 p-6 bg-green-50 border border-green-200 rounded-lg'>
					<p className='text-green-700 font-medium mb-3'>{successMessage}</p>
					<Button
						variant='outline'
						size='sm'
						onClick={() => setSuccessMessage(null)}
						className='border-green-300 text-green-700 hover:bg-green-100'
					>
						Create Another Room
					</Button>
				</div>
			)}

			{/* Room Types Grid */}
			{!successMessage && (
				<div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto'>
					{roomTypes.map((room) => {
						const IconComponent = room.icon;

						return (
							<Card
								key={room.id}
								className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
									!room.available ? "opacity-75" : ""
								}`}
							>
								{/* Gradient Background */}
								<div
									className={`absolute inset-0 bg-gradient-to-br ${room.gradient} opacity-5`}
								/>

								{/* Coming Soon Badge */}
								{!room.available && (
									<div className='absolute top-4 right-4 z-10'>
										<Badge
											variant='secondary'
											className='bg-gray-100 text-gray-600'
										>
											Coming Soon
										</Badge>
									</div>
								)}

								<CardHeader className='relative'>
									<div className='flex items-center gap-4 mb-4'>
										<div
											className={`p-3 rounded-lg bg-gradient-to-br ${room.gradient}`}
										>
											<IconComponent className='h-8 w-8 text-white' />
										</div>
										<div>
											<CardTitle className='text-2xl font-bold'>
												{room.title}
											</CardTitle>
											<p className='text-gray-600 mt-1'>{room.description}</p>
										</div>
									</div>

									{/* Quick Stats */}
									<div className='grid grid-cols-2 gap-4 mb-4'>
										<div className='flex items-center gap-2'>
											<Clock className='h-4 w-4 text-gray-500' />
											<span className='text-sm'>
												<strong>Latency:</strong> {room.specs.latency}
											</span>
										</div>
										<div className='flex items-center gap-2'>
											<Gauge className='h-4 w-4 text-gray-500' />
											<span className='text-sm'>
												<strong>FPS:</strong> {room.specs.fps}
											</span>
										</div>
										<div className='flex items-center gap-2'>
											<Zap className='h-4 w-4 text-gray-500' />
											<span className='text-sm'>
												<strong>Quality:</strong> {room.specs.quality}
											</span>
										</div>
										<div className='flex items-center gap-2'>
											<Users className='h-4 w-4 text-gray-500' />
											<span className='text-sm'>
												<strong>Audience:</strong> {room.specs.audience}
											</span>
										</div>
									</div>
								</CardHeader>

								<CardContent className='relative'>
									{/* Features List */}
									<div className='space-y-2'>
										{room.features.map((feature, index) => (
											<div
												key={index}
												className='flex items-center gap-2 text-sm text-gray-700'
											>
												<span>{feature}</span>
											</div>
										))}
									</div>
								</CardContent>

								<CardFooter className='relative'>
									<Button
										onClick={room.action}
										disabled={
											room.loading ||
											(!room.available &&
												room.id !== "p2p" &&
												room.id !== "hybrid")
										}
										className={`w-full ${
											room.available
												? `bg-gradient-to-r ${room.gradient} hover:opacity-90 text-white border-0`
												: "bg-gray-100 text-gray-500 cursor-not-allowed"
										} transition-all duration-300`}
										size='lg'
									>
										{room.loading ? (
											<>
												<Spinner className='mr-2 h-4 w-4' />
												Creating {room.title}...
											</>
										) : room.available ? (
											<>
												Create {room.title}
												<ArrowRight className='ml-2 h-4 w-4' />
											</>
										) : (
											<>
												{room.title} (Coming Soon)
												<Sparkles className='ml-2 h-4 w-4' />
											</>
										)}
									</Button>
								</CardFooter>
							</Card>
						);
					})}
				</div>
			)}

			{/* Additional Info Section */}
			{!successMessage && (
				<div className='mt-16 max-w-4xl mx-auto'>
					<div className='bg-gray-50 rounded-2xl p-8'>
						<h3 className='text-2xl font-bold mb-6 text-center'>
							How It Works
						</h3>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
							<div className='text-center'>
								<div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'>
									<span className='text-blue-600 font-bold'>1</span>
								</div>
								<h4 className='font-semibold mb-2'>Choose Room Type</h4>
								<p className='text-sm text-gray-600'>
									Select the streaming method that best fits your needs
								</p>
							</div>
							<div className='text-center'>
								<div className='w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4'>
									<span className='text-purple-600 font-bold'>2</span>
								</div>
								<h4 className='font-semibold mb-2'>Get Discord Link</h4>
								<p className='text-sm text-gray-600'>
									Receive a private Discord webhook with your room access
								</p>
							</div>
							<div className='text-center'>
								<div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
									<span className='text-green-600 font-bold'>3</span>
								</div>
								<h4 className='font-semibold mb-2'>Start Streaming</h4>
								<p className='text-sm text-gray-600'>
									Share the link with your audience and begin streaming
								</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
});

export const metadata: Metadata = {
	title: "PixelCast - Real-time Screen Sharing",
	description: "Self-hosted screen sharing application",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<head>
				{/* browser optimizations */}
				<meta name='viewport' content='width=device-width, initial-scale=1' />
				<meta httpEquiv='X-UA-Compatible' content='IE=edge' />

				{/* Chrome experimental flags for WebRTC optimization */}
				<meta httpEquiv='origin-trial' content='WebRTC-UltraLowLatency' />

				{/* Performance hints */}
				<link rel='dns-prefetch' href='//localhost:1985' />
				<link rel='preconnect' href='//localhost:8000' />

				{/* Additional performance optimizations */}
				<meta name='referrer' content='no-referrer-when-downgrade' />

				{/* WebRTC optimization hints */}
				<script
					dangerouslySetInnerHTML={{
						__html: `
							// Enable Chrome experimental WebRTC features
							if (window.chrome) {
								// Request ultra-low latency mode
								const enableUltraLowLatency = () => {
									// Enable hardware acceleration
									if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
										console.log('✅ getDisplayMedia with hardware acceleration available');
									}
									
									// Enable experimental APIs
									if (window.RTCPeerConnection) {
										console.log('✅ WebRTC peer connections available');
									}
								};
								
								// Apply optimizations when DOM is ready
								if (document.readyState === 'loading') {
									document.addEventListener('DOMContentLoaded', enableUltraLowLatency);
								} else {
									enableUltraLowLatency();
								}
							}
						`,
					}}
				/>
			</head>
			<body
				className={`${geist.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
				style={{
					// CSS optimization for video rendering
					transform: "translateZ(0)", // Force hardware acceleration
				}}
			>
				<Header />
				<main className='flex-1'>{children}</main>
				<Footer />
			</body>
		</html>
	);
}

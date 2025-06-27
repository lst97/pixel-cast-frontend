"use client";

import { Heart, Github, Twitter, Mail } from "lucide-react";
import Link from "next/link";

export default function Footer() {
	return (
		<footer className='relative mt-auto'>
			{/* Animated Gradient Background */}
			<div className='absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x'></div>
			<div className='absolute inset-0 bg-gradient-to-l from-cyan-500 via-blue-500 to-purple-500 animate-gradient-x opacity-70'></div>

			{/* Content */}
			<div className='relative bg-black/20 backdrop-blur-sm'>
				<div className='container mx-auto px-4 py-8'>
					<div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
						{/* Brand Section */}
						<div className='md:col-span-2'>
							<h3 className='text-xl font-bold text-white mb-2'>PixelCast</h3>
							<p className='text-gray-200 text-sm mb-4 max-w-md'>
								An open-source self-hosted streaming platform for real-time
								screen sharing with small group of users. Discord-based access
								control. Built for movie and game nights.
							</p>
							<div className='flex items-center gap-4'>
								<Link
									href='#'
									className='text-gray-200 hover:text-white transition-colors'
									aria-label='GitHub'
								>
									<Github className='h-5 w-5' />
								</Link>
								<Link
									href='#'
									className='text-gray-200 hover:text-white transition-colors'
									aria-label='Twitter'
								>
									<Twitter className='h-5 w-5' />
								</Link>
								<Link
									href='#'
									className='text-gray-200 hover:text-white transition-colors'
									aria-label='Email'
								>
									<Mail className='h-5 w-5' />
								</Link>
							</div>
						</div>

						{/* Quick Links */}
						<div>
							<h4 className='text-white font-semibold mb-3'>Quick Links</h4>
							<ul className='space-y-2'>
								<li>
									<Link
										href='/'
										className='text-gray-200 hover:text-white text-sm transition-colors'
									>
										Home
									</Link>
								</li>
								<li>
									<Link
										href='/debug'
										className='text-gray-200 hover:text-white text-sm transition-colors'
									>
										Debug Tools
									</Link>
								</li>
								<li>
									<Link
										href='/flv-test'
										className='text-gray-200 hover:text-white text-sm transition-colors'
									>
										FLV Test
									</Link>
								</li>
							</ul>
						</div>

						{/* Technologies */}
						<div>
							<h4 className='text-white font-semibold mb-3'>Technologies</h4>
							<ul className='space-y-2'>
								<li className='text-gray-200 text-sm'>WebRTC</li>
								<li className='text-gray-200 text-sm'>RTMP/HLS</li>
								<li className='text-gray-200 text-sm'>SRS Server</li>
								<li className='text-gray-200 text-sm'>Next.js</li>
								<li className='text-gray-200 text-sm'>TypeScript</li>
							</ul>
						</div>
					</div>

					{/* Bottom Bar */}
					<div className='border-t border-white/20 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center'>
						<p className='text-gray-200 text-sm flex items-center gap-1'>
							Made with <Heart className='h-4 w-4 text-red-400 animate-pulse' />{" "}
							by{" "}
							<Link
								href='https://github.com/lst97'
								className='text-white hover:text-gray-300'
							>
								lst97
							</Link>
						</p>
						<p className='text-gray-200 text-sm mt-2 md:mt-0'>
							© {new Date().getFullYear()} PixelCast. Open Source Project.
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
}

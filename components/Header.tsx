"use client";

import { ScreenShare, Github, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Header() {
	return (
		<header className='sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60'>
			<div className='container mx-auto px-4 py-4'>
				<div className='flex items-center justify-between'>
					{/* Logo and Brand */}
					<Link
						href='/'
						className='flex items-center gap-3 hover:opacity-80 transition-opacity'
					>
						<div className='relative'>
							<ScreenShare className='h-8 w-8 text-blue-600' />
							<div className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse'></div>
						</div>
						<div className='flex flex-col'>
							<h1 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
								PixelCast
							</h1>
							<p className='text-xs text-gray-500 -mt-1'>
								Self-hosted Screen Share and Streaming
							</p>
						</div>
					</Link>

					{/* Navigation Links */}
					<nav className='hidden md:flex items-center space-x-6'>
						<Link
							href='/'
							className='text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors'
						>
							Home
						</Link>
						<Link
							href='/debug'
							className='text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors'
						>
							Debug
						</Link>
						<div className='flex items-center space-x-2'>
							<Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
								<Github className='h-4 w-4' />
							</Button>
						</div>
					</nav>
				</div>
			</div>
		</header>
	);
}

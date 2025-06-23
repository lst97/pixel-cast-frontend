import { ScreenShare } from "lucide-react";

export default function Header() {
	return (
		<header className='border-b'>
			<div className='container mx-auto px-4 py-4 flex items-center gap-3'>
				<ScreenShare className='h-6 w-6' />
				<h1 className='text-xl font-semibold'>PixelCast</h1>
			</div>
		</header>
	);
}

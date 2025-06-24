"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
	children: React.ReactNode;
	content: string;
	side?: "top" | "bottom" | "left" | "right";
	className?: string;
}

const Tooltip = ({
	children,
	content,
	side = "top",
	className,
}: TooltipProps) => {
	const [isVisible, setIsVisible] = React.useState(false);

	return (
		<div
			className='relative inline-block'
			onMouseEnter={() => setIsVisible(true)}
			onMouseLeave={() => setIsVisible(false)}
		>
			{children}
			{isVisible && (
				<div
					className={cn(
						"absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap",
						side === "top" && "-top-8 left-1/2 transform -translate-x-1/2",
						side === "bottom" &&
							"-bottom-8 left-1/2 transform -translate-x-1/2",
						side === "left" &&
							"top-1/2 -left-2 transform -translate-y-1/2 -translate-x-full",
						side === "right" &&
							"top-1/2 -right-2 transform -translate-y-1/2 translate-x-full",
						className
					)}
				>
					{content}
				</div>
			)}
		</div>
	);
};

export { Tooltip };

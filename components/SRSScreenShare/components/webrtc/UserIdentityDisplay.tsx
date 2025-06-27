"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	getIdentityInfo,
	updateDisplayName,
	clearPersistentIdentity,
	isIdentityExpiringSoon,
} from "@/lib/persistentIdentity";
import { User, RefreshCw, Edit3, Trash2, AlertTriangle } from "lucide-react";

interface UserIdentityDisplayProps {
	className?: string;
	onIdentityChange?: () => void;
}

export const UserIdentityDisplay: React.FC<UserIdentityDisplayProps> = ({
	className,
	onIdentityChange,
}) => {
	const [identity, setIdentity] = useState<any>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [newDisplayName, setNewDisplayName] = useState("");
	const [isExpiringSoon, setIsExpiringSoon] = useState(false);

	useEffect(() => {
		const loadIdentity = () => {
			const identityInfo = getIdentityInfo();
			setIdentity(identityInfo);
			setIsExpiringSoon(isIdentityExpiringSoon());
			if (identityInfo) {
				setNewDisplayName(identityInfo.displayName);
			}
		};

		loadIdentity();
		// Refresh identity info every 30 seconds
		const interval = setInterval(loadIdentity, 30000);
		return () => clearInterval(interval);
	}, []);

	const handleUpdateDisplayName = () => {
		if (newDisplayName.trim() && newDisplayName !== identity?.displayName) {
			updateDisplayName(newDisplayName.trim());
			const updatedIdentity = getIdentityInfo();
			setIdentity(updatedIdentity);
			setIsEditing(false);
			onIdentityChange?.();
			console.log(`✏️ Display name updated to: ${newDisplayName.trim()}`);
		} else {
			setIsEditing(false);
		}
	};

	const handleClearIdentity = () => {
		if (
			confirm(
				"Are you sure you want to reset your identity? You'll get a new identity on the next page refresh."
			)
		) {
			clearPersistentIdentity();
			setIdentity(null);
			onIdentityChange?.();
			alert("Identity cleared! Refresh the page to get a new identity.");
		}
	};

	const handleRefresh = () => {
		window.location.reload();
	};

	if (!identity) {
		return (
			<Card className={`border-gray-300 ${className}`}>
				<CardContent className='p-4'>
					<div className='flex items-center gap-2 text-gray-500'>
						<User className='h-4 w-4' />
						<span className='text-sm'>No persistent identity found</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleString();
	};

	const getTimeSince = (timestamp: number) => {
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / (1000 * 60));
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
		if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
		if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
		return "Just now";
	};

	return (
		<Card className={`border-gray-300 ${className}`}>
			<CardHeader className='pb-3'>
				<CardTitle className='flex items-center justify-between text-sm'>
					<div className='flex items-center gap-2'>
						<User className='h-4 w-4' />
						<span>Your Identity</span>
						{isExpiringSoon && (
							<Badge
								variant='outline'
								className='text-orange-600 border-orange-300'
							>
								<AlertTriangle className='h-3 w-3 mr-1' />
								Expiring Soon
							</Badge>
						)}
					</div>
					<div className='flex gap-1'>
						<Button
							variant='ghost'
							size='sm'
							onClick={handleRefresh}
							title='Refresh page to test persistence'
						>
							<RefreshCw className='h-3 w-3' />
						</Button>
						<Button
							variant='ghost'
							size='sm'
							onClick={handleClearIdentity}
							title='Reset identity'
						>
							<Trash2 className='h-3 w-3' />
						</Button>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className='pt-0 space-y-3'>
				{/* Display Name */}
				<div>
					<Label className='text-xs text-gray-600'>Display Name</Label>
					<div className='flex items-center gap-2 mt-1'>
						{isEditing ? (
							<>
								<Input
									value={newDisplayName}
									onChange={(e) => setNewDisplayName(e.target.value)}
									placeholder='Enter display name'
									className='text-sm h-8'
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											handleUpdateDisplayName();
										}
										if (e.key === "Escape") {
											setIsEditing(false);
											setNewDisplayName(identity.displayName);
										}
									}}
									autoFocus
								/>
								<Button
									size='sm'
									onClick={handleUpdateDisplayName}
									className='h-8 px-2'
								>
									Save
								</Button>
							</>
						) : (
							<>
								<span className='text-sm font-medium flex-1'>
									{identity.displayName}
								</span>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => setIsEditing(true)}
									className='h-6 w-6 p-0'
								>
									<Edit3 className='h-3 w-3' />
								</Button>
							</>
						)}
					</div>
				</div>

				{/* Identity ID */}
				<div>
					<Label className='text-xs text-gray-600'>Identity ID</Label>
					<div className='text-xs font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded mt-1'>
						{identity.identity}
					</div>
				</div>

				{/* Last Used */}
				<div className='text-xs text-gray-500'>
					Last used: {getTimeSince(identity.lastUsed)}
				</div>

				{/* Room History */}
				{identity.roomHistory?.length > 0 && (
					<div>
						<Label className='text-xs text-gray-600'>Recent Rooms</Label>
						<div className='flex flex-wrap gap-1 mt-1'>
							{identity.roomHistory
								.slice(-3)
								.map((room: string, index: number) => (
									<Badge key={index} variant='secondary' className='text-xs'>
										{room}
									</Badge>
								))}
						</div>
					</div>
				)}

				{isExpiringSoon && (
					<div className='text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200'>
						⚠️ Your identity will expire soon. It will be automatically renewed
						when you visit.
					</div>
				)}
			</CardContent>
		</Card>
	);
};

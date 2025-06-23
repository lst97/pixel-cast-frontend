"use client";

import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
	Settings,
	Share,
	Signal,
	SignalHigh,
	SignalLow,
	SignalMedium,
	Shield,
	Mic,
	MicOff,
	Video,
	VideoOff,
	ChevronDown,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import {
	VideoPreset,
	ParticipantEvent,
	ConnectionQuality,
} from "livekit-client";
import { ScreenSharePresets } from "livekit-client";

const resolutions = [
	{ label: "360p (16:9)", value: "h360" },
	{ label: "720p (16:9)", value: "h720" },
	{ label: "1080p (16:9)", value: "h1080" },
];

const frameRates = [
	{ label: "15 fps", value: 15 },
	{ label: "30 fps", value: 30 },
	{ label: "60 fps", value: 60 },
];

const resolutionPresets: { [key: string]: VideoPreset } = {
	h360: ScreenSharePresets.h360fps15,
	h720: ScreenSharePresets.h720fps15,
	h1080: ScreenSharePresets.h1080fps30,
};

export function RoomControls() {
	const { localParticipant } = useLocalParticipant();
	const room = useRoomContext();
	const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(
		localParticipant.connectionQuality
	);
	const [isScreenSharing, setIsScreenSharing] = useState(false);
	const [resolution, setResolution] = useState("h720");
	const [frameRate, setFrameRate] = useState(30);
	const [isAudioEnabled, setIsAudioEnabled] = useState(false);
	const [isCameraEnabled, setIsCameraEnabled] = useState(false);
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
	const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");

	useEffect(() => {
		const onConnectionQualityChanged = (quality: ConnectionQuality) => {
			setConnectionQuality(quality);
		};
		localParticipant.on(
			ParticipantEvent.ConnectionQualityChanged,
			onConnectionQualityChanged
		);
		return () => {
			localParticipant.off(
				ParticipantEvent.ConnectionQualityChanged,
				onConnectionQualityChanged
			);
		};
	}, [localParticipant]);

	useEffect(() => {
		const getDevices = async () => {
			try {
				const devices = await navigator.mediaDevices.enumerateDevices();
				const audioInputs = devices.filter(
					(device) => device.kind === "audioinput"
				);
				const videoInputs = devices.filter(
					(device) => device.kind === "videoinput"
				);
				setAudioDevices(audioInputs);
				setVideoDevices(videoInputs);

				// Set default devices
				if (audioInputs.length > 0 && !selectedAudioDevice) {
					setSelectedAudioDevice(audioInputs[0].deviceId);
				}
				if (videoInputs.length > 0 && !selectedVideoDevice) {
					setSelectedVideoDevice(videoInputs[0].deviceId);
				}
			} catch (error) {
				console.error("Error getting devices:", error);
			}
		};
		getDevices();
	}, [selectedAudioDevice, selectedVideoDevice]);

	const handleScreenShare = async () => {
		if (isScreenSharing) {
			localParticipant.setScreenShareEnabled(false);
			setIsScreenSharing(false);
		} else {
			const preset = resolutionPresets[resolution];
			await localParticipant.setScreenShareEnabled(true, preset);
			setIsScreenSharing(true);
		}
	};

	const toggleAudio = async () => {
		try {
			const newState = !isAudioEnabled;
			if (newState && selectedAudioDevice) {
				await localParticipant.setMicrophoneEnabled(true, {
					deviceId: selectedAudioDevice,
				});
			} else {
				await localParticipant.setMicrophoneEnabled(false);
			}
			setIsAudioEnabled(newState);
		} catch (error) {
			console.error("Error toggling microphone:", error);
		}
	};

	const toggleCamera = async () => {
		try {
			const newState = !isCameraEnabled;
			if (newState && selectedVideoDevice) {
				await localParticipant.setCameraEnabled(true, {
					deviceId: selectedVideoDevice,
				});
			} else {
				await localParticipant.setCameraEnabled(false);
			}
			setIsCameraEnabled(newState);
		} catch (error) {
			console.error("Error toggling camera:", error);
		}
	};

	const selectAudioDevice = async (deviceId: string) => {
		setSelectedAudioDevice(deviceId);
		if (isAudioEnabled) {
			await localParticipant.setMicrophoneEnabled(true, { deviceId });
		}
	};

	const selectVideoDevice = async (deviceId: string) => {
		setSelectedVideoDevice(deviceId);
		if (isCameraEnabled) {
			await localParticipant.setCameraEnabled(true, { deviceId });
		}
	};

	const ConnectionQualityIndicator = () => {
		switch (connectionQuality) {
			case "excellent":
				return <SignalHigh className='h-4 w-4 text-green-500' />;
			case "good":
				return <Signal className='h-4 w-4 text-yellow-500' />;
			case "poor":
				return <SignalLow className='h-4 w-4 text-red-500' />;
			default:
				return <SignalMedium className='h-4 w-4 text-gray-500' />;
		}
	};

	const E2EEIndicator = () => {
		const isE2EE = room.isE2EEEnabled;
		return (
			<div className='flex items-center gap-2'>
				<Shield
					className={`h-4 w-4 ${isE2EE ? "text-green-500" : "text-red-500"}`}
				/>
				<span className='text-sm text-muted-foreground'>
					{isE2EE ? "E2EE Enabled" : "E2EE Disabled"}
				</span>
			</div>
		);
	};

	return (
		<div className='flex items-center justify-between p-4 bg-card rounded-lg'>
			<div className='flex items-center gap-4'>
				<E2EEIndicator />
				<div className='flex items-center gap-2'>
					<ConnectionQualityIndicator />
					<span className='text-sm text-muted-foreground'>
						{connectionQuality}
					</span>
				</div>
			</div>
			<div className='flex items-center gap-4'>
				<div className='flex items-center'>
					<Button
						onClick={toggleCamera}
						variant={isCameraEnabled ? "default" : "outline"}
						className='flex items-center gap-2 rounded-r-none'
					>
						{isCameraEnabled ? (
							<>
								<Video className='h-4 w-4' />
								Cam On
							</>
						) : (
							<>
								<VideoOff className='h-4 w-4' />
								Cam Off
							</>
						)}
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant={isCameraEnabled ? "default" : "outline"}
								className='rounded-l-none border-l-0 px-2'
							>
								<ChevronDown className='h-3 w-3' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{videoDevices.map((device) => (
								<DropdownMenuItem
									key={device.deviceId}
									onClick={() => selectVideoDevice(device.deviceId)}
									className={
										selectedVideoDevice === device.deviceId ? "bg-accent" : ""
									}
								>
									{device.label || `Camera ${device.deviceId.slice(0, 8)}`}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<div className='flex items-center'>
					<Button
						onClick={toggleAudio}
						variant={isAudioEnabled ? "default" : "outline"}
						className='flex items-center gap-2 rounded-r-none'
					>
						{isAudioEnabled ? (
							<>
								<Mic className='h-4 w-4' />
								Mute
							</>
						) : (
							<>
								<MicOff className='h-4 w-4' />
								Unmute
							</>
						)}
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant={isAudioEnabled ? "default" : "outline"}
								className='rounded-l-none border-l-0 px-2'
							>
								<ChevronDown className='h-3 w-3' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{audioDevices.map((device) => (
								<DropdownMenuItem
									key={device.deviceId}
									onClick={() => selectAudioDevice(device.deviceId)}
									className={
										selectedAudioDevice === device.deviceId ? "bg-accent" : ""
									}
								>
									{device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<Button onClick={handleScreenShare} variant='outline'>
					<Share className='h-4 w-4 mr-2' />
					{isScreenSharing ? "Stop Sharing" : "Share Screen"}
				</Button>
				<Popover>
					<PopoverTrigger asChild>
						<Button variant='outline'>
							<Settings className='h-4 w-4' />
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-80'>
						<div className='grid gap-4'>
							<div className='space-y-2'>
								<h4 className='font-medium leading-none'>Screen Share</h4>
								<p className='text-sm text-muted-foreground'>
									Configure screen sharing settings.
								</p>
							</div>
							<div className='grid gap-2'>
								<div className='grid grid-cols-3 items-center gap-4'>
									<Label htmlFor='resolution'>Resolution</Label>
									<Select
										value={resolution}
										onValueChange={setResolution}
										disabled={isScreenSharing}
									>
										<SelectTrigger className='col-span-2'>
											<SelectValue placeholder='Select resolution' />
										</SelectTrigger>
										<SelectContent>
											{resolutions.map((r) => (
												<SelectItem key={r.value} value={r.value}>
													{r.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className='grid grid-cols-3 items-center gap-4'>
									<Label htmlFor='framerate'>Frame Rate</Label>
									<Select
										value={String(frameRate)}
										onValueChange={(v) => setFrameRate(Number(v))}
										disabled={isScreenSharing}
									>
										<SelectTrigger className='col-span-2'>
											<SelectValue placeholder='Select frame rate' />
										</SelectTrigger>
										<SelectContent>
											{frameRates.map((f) => (
												<SelectItem key={f.value} value={String(f.value)}>
													{f.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}

export interface SRSMonitorData {
	isConnected: boolean;
	serverVersion: string;
	serverUptime: number;
	cpuUsage: number;
	memoryUsage: number;
	diskUsage: number;
	loadAverage: number[];
	streamCount: number;
	totalClients: number;
	streamInfo?: {
		publish?: {
			active: boolean;
			cid: number;
		};
		clients?: number;
		kbps?: {
			recv_30s: number;
			send_30s: number;
		};
		video?: {
			codec: string;
			profile: string;
			level: string;
			width: number;
			height: number;
		};
		audio?: {
			codec: string;
			sample_rate: number;
			channel: number;
			profile: string;
		};
		live_ms?: number;
	};
	now_ms: number;
}

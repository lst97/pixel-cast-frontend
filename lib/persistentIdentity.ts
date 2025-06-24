// Persistent Identity Management for PixelCast
// Remembers user identity across page refreshes without using URL parameters

interface PersistentIdentity {
	identity: string;
	displayName: string;
	createdAt: number;
	lastUsed: number;
	roomHistory: string[];
}

const STORAGE_KEY = "pixelcast_identity";
const IDENTITY_EXPIRY_DAYS = 7; // Keep identity for 7 days

/**
 * Generate a unique identity string
 */
function generateUniqueIdentity(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substr(2, 5);
	return `User-${timestamp}-${random}`;
}

/**
 * Generate a friendly display name
 */
function generateDisplayName(): string {
	const adjectives = [
		"Happy",
		"Bright",
		"Cool",
		"Swift",
		"Smart",
		"Calm",
		"Bold",
		"Kind",
		"Wise",
		"Pure",
		"Quick",
		"Brave",
		"Gentle",
		"Loyal",
		"Sharp",
		"Clear",
	];

	const nouns = [
		"Panda",
		"Fox",
		"Wolf",
		"Eagle",
		"Tiger",
		"Lion",
		"Bear",
		"Hawk",
		"Owl",
		"Cat",
		"Dog",
		"Rabbit",
		"Deer",
		"Bird",
		"Fish",
		"Whale",
	];

	const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
	const noun = nouns[Math.floor(Math.random() * nouns.length)];
	const number = Math.floor(Math.random() * 99) + 1;

	return `${adjective}${noun}${number}`;
}

/**
 * Get or create a persistent identity for the user
 */
export function getPersistentIdentity(roomName?: string): PersistentIdentity {
	try {
		// Check if we're in browser environment
		if (typeof window === "undefined") {
			// Server-side: generate temporary identity
			return createNewIdentity(roomName);
		}

		const stored = localStorage.getItem(STORAGE_KEY);

		if (stored) {
			const identity: PersistentIdentity = JSON.parse(stored);

			// Check if identity has expired
			const expiryTime =
				identity.createdAt + IDENTITY_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

			if (Date.now() < expiryTime) {
				// Update last used and room history
				identity.lastUsed = Date.now();

				if (roomName && !identity.roomHistory.includes(roomName)) {
					identity.roomHistory.push(roomName);
					// Keep only last 10 rooms
					if (identity.roomHistory.length > 10) {
						identity.roomHistory = identity.roomHistory.slice(-10);
					}
				}

				// Save updated identity
				localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));

				console.log(
					`🆔 Using existing identity: ${identity.identity} (${identity.displayName})`
				);
				return identity;
			} else {
				console.log("🕒 Identity expired, creating new one");
				localStorage.removeItem(STORAGE_KEY);
			}
		}

		// Create new identity
		const newIdentity = createNewIdentity(roomName);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(newIdentity));

		console.log(
			`🆔 Created new persistent identity: ${newIdentity.identity} (${newIdentity.displayName})`
		);
		return newIdentity;
	} catch (error) {
		console.warn("⚠️ Error with persistent identity, using temporary:", error);
		return createNewIdentity(roomName);
	}
}

/**
 * Create a new identity object
 */
function createNewIdentity(roomName?: string): PersistentIdentity {
	const now = Date.now();
	return {
		identity: generateUniqueIdentity(),
		displayName: generateDisplayName(),
		createdAt: now,
		lastUsed: now,
		roomHistory: roomName ? [roomName] : [],
	};
}

/**
 * Update the display name for the current identity
 */
export function updateDisplayName(newDisplayName: string): void {
	try {
		if (typeof window === "undefined") return;

		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const identity: PersistentIdentity = JSON.parse(stored);
			identity.displayName = newDisplayName;
			identity.lastUsed = Date.now();
			localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));

			console.log(`🏷️ Updated display name to: ${newDisplayName}`);
		}
	} catch (error) {
		console.warn("⚠️ Error updating display name:", error);
	}
}

/**
 * Clear the stored identity (logout)
 */
export function clearPersistentIdentity(): void {
	try {
		if (typeof window === "undefined") return;

		localStorage.removeItem(STORAGE_KEY);
		console.log("🗑️ Cleared persistent identity");
	} catch (error) {
		console.warn("⚠️ Error clearing identity:", error);
	}
}

/**
 * Get identity info for debugging
 */
export function getIdentityInfo(): PersistentIdentity | null {
	try {
		if (typeof window === "undefined") return null;

		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : null;
	} catch (error) {
		console.warn("⚠️ Error getting identity info:", error);
		return null;
	}
}

/**
 * Check if identity is about to expire (within 1 day)
 */
export function isIdentityExpiringSoon(): boolean {
	try {
		if (typeof window === "undefined") return false;

		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return false;

		const identity: PersistentIdentity = JSON.parse(stored);
		const expiryTime =
			identity.createdAt + IDENTITY_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
		const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;

		return expiryTime < oneDayFromNow;
	} catch (error) {
		console.warn("⚠️ Error checking identity expiry:", error);
		return false;
	}
}

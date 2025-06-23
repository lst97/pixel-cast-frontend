# PixelCast - Screen Sharing Made Simple

A modern web-based screen sharing application built with Next.js and LiveKit.

## Features

- 🚀 **Instant Room Creation**: Create a sharing room with just your name
- 📺 **Screen Sharing**: Share your screen with multiple viewers
- 🌙 **Dark Mode**: Beautiful dark theme by default
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Real-time**: Low-latency screen sharing powered by LiveKit

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Real-time Communication**: LiveKit Client SDK & Server SDK
- **Token Generation**: Integrated Next.js API Routes
- **State Management**: Zustand & React Context
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (preferred) or npm

### Installation

1.Clone the repository:

```bash
git clone <your-repo-url>
cd pixelcast
```

2.Install dependencies:

```bash
pnpm install
```

3.Set up environment variables:
Create a `.env.local` file in the frontend directory:

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_LIVEKIT_URL="ws://your-livekit-server:7880"
```

4.Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Host Flow

1. Enter your name on the homepage
2. Click "Start Sharing" to create a new room
3. Share the room URL with viewers
4. Click "Share Screen" to start broadcasting

### Viewer Flow

1. Receive a room link from the host
2. Join the room automatically
3. Watch the host's screen share in real-time

## Project Structure

```sh
pixelcast/
├── app/
│   ├── api/token/          # Integrated LiveKit token generation
│   ├── room/[roomName]/    # Dynamic room pages
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout with theme provider
│   └── page.tsx            # Homepage with room creation
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── Header.tsx          # Application header
│   └── LiveKitRoomWrapper.tsx # LiveKit integration
└── lib/
    └── utils.ts            # Utility functions
```

## Environment Variables

- `LIVEKIT_API_KEY`: Your LiveKit API key (server-side)
- `LIVEKIT_API_SECRET`: Your LiveKit API secret (server-side)
- `NEXT_PUBLIC_LIVEKIT_URL`: Your LiveKit server WebSocket URL (client-side)

## Deployment

This application is designed to be deployed on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set up environment variables in Vercel dashboard
4. Deploy automatically on every push

## Development Notes

- The token endpoint (`/api/token`) generates real LiveKit JWT tokens using the server SDK
- No separate backend server is required - token generation is integrated into Next.js
- Ensure your LiveKit server is properly configured for screen sharing
- The application uses dark theme by default but supports system theme detection

## Architecture

This application uses a simplified architecture with:

- **Frontend**: Next.js application with React components
- **Token Generation**: Integrated Next.js API route using LiveKit Server SDK
- **Real-time Communication**: Direct connection to LiveKit server

No separate backend server is required, making deployment and development much simpler.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

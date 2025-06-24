# PixelCast - Screen Sharing Made Simple

A modern web-based screen sharing application built with Next.js and SRS (Simple Realtime Server).

## Features

- 🚀 **Instant Room Creation**: Create a sharing room with just your name
- 📺 **Screen Sharing Only**: Focused screen sharing without camera/microphone
- 🌙 **Dark Mode**: Beautiful dark theme by default
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Real-time**: Low-latency screen sharing powered by SRS
- 🎛️ **Quality Control**: Adjustable resolution and frame rate settings
- 🔒 **Simple & Secure**: No account required, room-based access

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Media Server**: SRS (Simple Realtime Server)
- **WebRTC Protocol**: WHIP (WebRTC-HTTP Ingestion Protocol) & WHEP (WebRTC-HTTP Egress Protocol)
- **API Integration**: Next.js API Routes with SRS webhooks
- **State Management**: React Hooks & Context
- **Deployment**: Docker + Next.js

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- pnpm (preferred) or npm

### Installation

1. **Clone the repository:**

```bash
git clone <your-repo-url>
cd pixelcast
```

2. **Start SRS Server:**

```bash
cd backend
./start-srs.sh
```

3. **Install frontend dependencies:**

```bash
cd frontend
pnpm install
```

4. **Set up environment variables:**
Create a `.env.local` file in the frontend directory:

```env
# SRS Configuration
SRS_API_URL=http://localhost:1985
SRS_SERVER_URL=http://localhost:8000
NEXT_PUBLIC_SRS_SERVER_URL=http://localhost:8000
```

5. **Run the development server:**

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
├── backend/
│   ├── docker-compose.yml  # SRS server configuration
│   ├── srs.conf           # SRS configuration file
│   ├── start-srs.sh       # SRS startup script
│   └── README.md          # Backend documentation
└── frontend/
    ├── app/
    │   ├── api/
    │   │   ├── token/         # SRS room configuration generation
    │   │   └── srs/           # SRS webhook endpoints
    │   ├── room/[roomName]/   # Dynamic room pages
    │   ├── globals.css        # Global styles
    │   ├── layout.tsx         # Root layout with theme provider
    │   └── page.tsx           # Homepage with room creation
    ├── components/
    │   ├── ui/                # shadcn/ui components
    │   ├── Header.tsx         # Application header
    │   ├── SRSRoomWrapper.tsx # SRS integration wrapper
    │   └── SRSScreenShare.tsx # Screen sharing component
    └── lib/
        └── utils.ts           # Utility functions
```

## Environment Variables

- `SRS_API_URL`: SRS API endpoint (default: <http://localhost:1985>)
- `SRS_SERVER_URL`: SRS WebRTC server URL (default: <http://localhost:8000>)
- `NEXT_PUBLIC_SRS_SERVER_URL`: SRS WebRTC URL for client-side (default: <http://localhost:8000>)

## Deployment

This application uses Docker for both development and production:

**Development:**

1. Start SRS server: `cd backend && ./start-srs.sh`
2. Start frontend: `cd frontend && pnpm dev`

**Production:**

1. Configure SRS for production environment
2. Set proper external IP addresses and domains
3. Use TURN servers for NAT traversal
4. Deploy frontend with production build

## Development Notes

- **Screen Sharing Only**: This application is focused solely on screen sharing
- **No Authentication**: Simple room-based access without user accounts
- **WebRTC WHIP/WHEP**: Uses modern WebRTC protocols for publishing and playing
- **SRS Webhooks**: Integrated webhook endpoints for room management
- **Real-time Updates**: SRS handles WebRTC peer connections and media relay

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   SRS Server    │    │   Viewers       │
│   (Publisher)   │────│                 │────│   (Subscribers) │
│                 │    │   Docker        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
    WebRTC WHIP           Port 8000             WebRTC WHEP
        │                      │                      │
        └──────────────────────┼──────────────────────┘
               Next.js API Routes (Webhooks)
```

This architecture provides:

- **Scalability**: SRS can handle multiple concurrent sessions
- **Low Latency**: Direct WebRTC connections through SRS
- **Simplicity**: Docker-based deployment with minimal configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

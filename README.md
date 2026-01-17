# CheezyIO 🧀 2.0

A high-performance, multiplayer .io style game where you play as a mouse, eat cheese to grow, and compete against other players and bots. Built for scale with Room-based architecture and binary networking.

![Game Screenshot](https://via.placeholder.com/800x400?text=CheezyIO+2.0)

## 🚀 Features

### Gameplay

- **Massive Multiplayer**: Real-time gameplay supporting 100+ concurrent users via automatic room scaling.
- **Advanced Physics**: Size/speed trade-offs, boosting mechanics, and dynamic camera zoom.
- **Combat**: Eat players <90% your size. Defeated players explode into scattered cheese loot.
- **Power-Ups**: ⚡ Speed (2x), 👻 Ghost (Invisibility), 🧲 Magnet (Attraction).
- **Smart AI**: Bots that hunt, forage, and flee based on real-time threat analysis.

### Technical Architecture

- **Single-Node Architecture**: Scalable room-based game logic optimized for efficient single-node deployment.
- **Binary Networking**: Uses `MsgPack` protocol over Socket.IO for 60FPS updates with minimal bandwidth.
- **Interest Management**: Optimized security; "Invisible" players are filtered from opponents' data streams.
- **Observability**: Built-in `/health` endpoint exposes real-time room and player stats.

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Phaser 3.90
- **Backend**: Node.js, Express, Socket.IO (MsgPack Parser)
- **Language**: TypeScript (Full Stack)
- **Infrastructure**: Docker, Google Cloud Run, Cloud Build

## 📦 Run Locally

### Option A: Standard (Node.js)

Requires `pnpm` and `node`. Runs in single-node mode (Memory Adapter).

```bash
pnpm install
pnpm dev
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

### Option B: Docker Compose

Runs the full stack in a container.

```bash
docker-compose up --build
# Game accessible at http://localhost:8000 (serves static frontend)
```

## ☁️ Deployment (Google Cloud)

This project includes a fully automated workflow for deploying to **Google Cloud Run** using **Cloud Build**.

👉 **[View Detailed Deployment Guide](.agent/workflows/deploy_to_gcp.md)**

### Brief Overview

1.  **Infrastructure**: Requires Cloud Run + Memorystore (Redis).
2.  **Pipeline**: The `cloudbuild.yaml` file handles Building, Pushing, and Deploying.
3.  **Environment**:
    - `REDIS_URL`: Removed (Single-node only)
    - `ALLOWED_ORIGIN`: Your Cloud Run URL (Required for CORS)

## 🎮 Controls

| Action       | Input                     |
| :----------- | :------------------------ |
| **Move**     | Mouse Cursor / Touch      |
| **Boost**    | Hold Left Click / Touch   |
| **Chat**     | Enter Key                 |
| **Spectate** | 'S' Key (or Login Option) |

## 📂 Project Structure

- `client/` - Next.js Application
  - `components/GameScene.ts` - Client-side Physics & Rendering (Phaser)
- `src/` - Node.js Server
  - `game/RoomManager.ts` - Scaling logic (Route players -> Rooms)
  - `game/GameManager.ts` - Authoritative Game Logic (1 Instance per Room)
  - `server.ts`: Entry point, Rate Limiting
- `docker-compose.yml` - Local Dev orchestration
- `cloudbuild.yaml` - CI/CD Pipeline

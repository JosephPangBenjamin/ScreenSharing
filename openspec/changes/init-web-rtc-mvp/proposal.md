# Change: Initialize WebRTC MVP (The Connection)

## Why
To provide a zero-barrier, cross-platform real-time communication tool that allows users to connect instantly via audio/video without registration. This MVP validates the core P2P connection stability and quality.

## What Changes
- **New Signaling Server:** A WebSocket-based server to handle room management and WebRTC signaling (SDP/ICE exchange).
- **New WebRTC Client:** A frontend module to manage P2P connections, media streams (A/V), and data channels.
- **New UI/UX:** An "Immersive" (Zen mode) interface maximizing video area with floating controls and chat bubbles.
- **Features:**
    - Room-based joining (ID + Nickname).
    - 1v1 Audio/Video calls.
    - Real-time text chat (P2P DataChannel).
    - PC-only Screen Sharing.
    - Local Screenshot.
    - Mute/Unmute & Camera Toggle.

## Impact
- **Affected Specs:**
    - `signaling` (New capability)
    - `webrtc-core` (New capability)
    - `ui-layout` (New capability)
- **Affected Code:**
    - New server-side entry point for signaling.
    - New client-side modules for WebRTC and UI management.
    - `index.html` structure updates.

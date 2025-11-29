## Context
Building a 1v1 WebRTC video call MVP. The goal is low latency, privacy (P2P), and ease of use (no login).

## Goals / Non-Goals
- **Goals:**
    - Stable P2P 1v1 connection.
    - Cross-platform (PC/Mobile) UI support.
    - Text chat via DataChannel (no server storage).
- **Non-Goals:**
    - Server-side recording.
    - Multi-party calls (SFU/MCU).
    - User accounts or persistent history.
    - File transfer (postponed to V1.5).

## Decisions
- **Decision 1: P2P Topology**
    - **Why:** Lowest cost and latency for 1v1. No media server required.
- **Decision 2: WebSocket Signaling**
    - **Why:** Full-duplex communication is essential for signaling events. Native `ws` library chosen for lightweight performance.
- **Decision 3: Ephemeral Identity**
    - **Why:** "Room ID + Nickname" model reduces friction. No database required for MVP.
- **Decision 4: "Zen" UI Layout**
    - **Why:** Maximizes video real estate, prioritizing the "Connection" experience.

## Risks / Trade-offs
- **NAT Traversal:** P2P may fail on complex networks.
    - *Mitigation:* Use public STUN servers for MVP. Plan for TURN in future.
- **Mobile WebRTC:** Background execution and screen lock may interrupt connection.
    - *Mitigation:* Handle visibility change events and attempt auto-reconnect.

## Open Questions
- None for MVP scope.

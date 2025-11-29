## 1. Infrastructure & Signaling
- [ ] 1.1 Initialize WebSocket server (e.g., using `ws` library).
- [ ] 1.2 Implement `JOIN_ROOM` logic and room management (max 2 users).
- [ ] 1.3 Implement Signaling forwarding (Offer, Answer, ICE Candidate).
- [ ] 1.4 Handle user disconnection and room cleanup (`LEAVE_ROOM`).

## 2. WebRTC Core (Client)
- [ ] 2.1 Implement `SignalingClient` to handle WebSocket communication.
- [ ] 2.2 Implement `WebRTCClient` to manage `RTCPeerConnection`.
- [ ] 2.3 Implement media stream acquisition (`getUserMedia`).
- [ ] 2.4 Implement P2P connection flow (Offer/Answer/ICE exchange).
- [ ] 2.5 Implement `RTCDataChannel` for text chat.
- [ ] 2.6 Implement `getDisplayMedia` for screen sharing (PC only).

## 3. UI/UX Implementation (The Zen)
- [ ] 3.1 Create HTML structure for video containers (Remote full, Local PIP).
- [ ] 3.2 Implement floating control bar (Mute, Camera, Hangup, Chat Toggle).
- [ ] 3.3 Implement chat bubble display and floating chat input.
- [ ] 3.4 Implement screenshot functionality (`canvas` draw).
- [ ] 3.5 Integrate UI events with `WebRTCClient` methods.

## 4. Validation & Polish
- [ ] 4.1 Verify 1v1 connection stability on LAN.
- [ ] 4.2 Verify cross-device connection (PC <-> Mobile).
- [ ] 4.3 Test room limit (3rd user rejection).
- [ ] 4.4 Verify screen sharing visibility on mobile.

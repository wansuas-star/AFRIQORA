AFRIQORA Calling - Quick Start

This project adds a minimal WebRTC + signaling example to enable one-to-one voice and video calls between users.

Files added:
- `server/signaling-server.js` - Minimal Node.js WebSocket signaling server (requires `ws` package).
- `index.html` - Added `#call-modal-root` container for call UI.
- `script.js` - Added WebRTC client and SignalingClient wiring. Call buttons are added to business and marketplace cards.

How it works
1. Clients open the AFRIQORA page and the `script.js` connects to the signaling server at `ws://localhost:8080` by default.
2. Each client registers with a generated clientId stored in localStorage.
3. When a caller presses Call/Video Call, the client creates an SDP offer and sends it to the target via the signaling server. The callee receives the offer and can Accept or Decline.
4. On Accept, the callee creates an SDP answer and the WebRTC peer connection is established using a public STUN server.

Run the signaling server locally

1. Install dependencies (Node.js required):

```bash
npm install ws
node server/signaling-server.js
```

2. Open AFRIQORA in two different browsers/devices and ensure both can access the signaling server (if testing across devices, ensure the server is reachable from both).

Notes and limitations
- A TURN server is NOT included. Without TURN, connectivity may fail between peers behind strict NATs. For production add a TURN server (coturn) and include it in the iceServers array.
- This signaling server is minimal: it simply forwards messages between registered clientIds. Add authentication and secure WSS for production.
- The client stores a `afriqoraClientId` in localStorage. To associate calls to business owners, open AFRIQORA in the seller's browser and note their clientId (or modify to use business id registration).
- The calling implementation is basic and intended as a prototype only.

Security
- Always serve pages over HTTPS and signaling over WSS in production to avoid mixed content and to ensure getUserMedia works on secure contexts.

If you want, I can:
- Add UI polish to the call modal to match AFRIQORA design further.
- Add optional TURN server configuration support.
- Add an admin endpoint to list connected clients for testing.

/** Đồng bộ với Frontend/src/constants/call.ts để P2P mobile ↔ web qua NAT. */
export const WEBRTC_ICE_SERVERS = [
  {
    urls: 'stun:stun.relay.metered.ca:80',
  },
  {
    urls: 'turn:global.relay.metered.ca:80',
    username: 'f8b013b70bd8623398d93c36',
    credential: 'Isg9sKYeOWC7W/9O',
  },
  {
    urls: 'turn:global.relay.metered.ca:80?transport=tcp',
    username: 'f8b013b70bd8623398d93c36',
    credential: 'Isg9sKYeOWC7W/9O',
  },
  {
    urls: 'turn:global.relay.metered.ca:443',
    username: 'f8b013b70bd8623398d93c36',
    credential: 'Isg9sKYeOWC7W/9O',
  },
  {
    urls: 'turns:global.relay.metered.ca:443?transport=tcp',
    username: 'f8b013b70bd8623398d93c36',
    credential: 'Isg9sKYeOWC7W/9O',
  },
];

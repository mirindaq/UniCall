/** URL LiveKit công khai từ thiết bị (vd. wss://host:7880). Ghi đè URL backend trả về (thường localhost). */
export const resolveLiveKitServerUrl = (backendUrl: string): string => {
  const override = process.env.EXPO_PUBLIC_LIVEKIT_URL?.trim();
  const raw = (override || backendUrl || '').trim();
  if (!raw) {
    return raw;
  }
  if (raw.startsWith('https://')) {
    return `wss://${raw.slice(8)}`;
  }
  if (raw.startsWith('http://')) {
    return `ws://${raw.slice(7)}`;
  }
  return raw;
};

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

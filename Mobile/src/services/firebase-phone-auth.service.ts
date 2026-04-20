import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseConfig() {
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.authDomain ||
    !firebaseConfig.projectId ||
    !firebaseConfig.appId
  ) {
    throw new Error('Firebase config is missing. Please set EXPO_PUBLIC_FIREBASE_* env variables.');
  }

  return firebaseConfig;
}

export function getFirebaseAuth() {
  if (authInstance) {
    return authInstance;
  }

  appInstance = initializeApp(getFirebaseConfig());
  authInstance = getAuth(appInstance);
  return authInstance;
}

export function toFirebasePhoneNumber(phoneNumber: string) {
  const raw = phoneNumber.trim();
  const digits = raw.replace(/\D/g, '');

  if (/^0\d{9}$/.test(digits)) {
    return `+84${digits.slice(1)}`;
  }
  if (/^84\d{9}$/.test(digits)) {
    return `+${digits}`;
  }
  if (/^\+84\d{9}$/.test(raw)) {
    return raw;
  }

  throw new Error('Số điện thoại không hợp lệ. Vui lòng nhập theo định dạng Việt Nam.');
}

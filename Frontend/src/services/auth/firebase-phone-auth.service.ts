import { initializeApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth, RecaptchaVerifier } from "firebase/auth"

let appInstance: FirebaseApp | null = null
let authInstance: Auth | null = null

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export function getFirebaseAuth() {
  if (authInstance) {
    return authInstance
  }

  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.authDomain ||
    !firebaseConfig.projectId ||
    !firebaseConfig.appId
  ) {
    throw new Error("Firebase config is missing. Please set VITE_FIREBASE_* env variables.")
  }

  appInstance = initializeApp(firebaseConfig)
  authInstance = getAuth(appInstance)
  return authInstance
}

export function toFirebasePhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.trim().replace(/\D/g, "")
  if (/^0\d{9}$/.test(digits)) {
    return `+84${digits.slice(1)}`
  }
  if (/^84\d{9}$/.test(digits)) {
    return `+${digits}`
  }
  if (/^\+84\d{9}$/.test(phoneNumber.trim())) {
    return phoneNumber.trim()
  }
  throw new Error("Số điện thoại không hợp lệ. Vui lòng nhập theo định dạng Việt Nam.")
}

export function createInvisibleRecaptcha(auth: Auth, containerId: string) {
  return new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  })
}

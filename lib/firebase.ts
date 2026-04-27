import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing env ${name}. Add it to .env.local (see .env.example).`)
  }
  return value
}

export type FirebaseClient = {
  app: FirebaseApp
  auth: Auth
}

let cached: FirebaseClient | null = null

export function getFirebaseClient(): FirebaseClient {
  if (cached) return cached

  const config = {
    apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: requireEnv(
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ),
    projectId: requireEnv(
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ),
    appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  }

  const app = getApps().length ? getApps()[0]! : initializeApp(config)
  const auth = getAuth(app)

  cached = { app, auth }
  return cached
}


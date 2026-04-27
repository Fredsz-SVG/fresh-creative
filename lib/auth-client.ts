import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  type User,
} from 'firebase/auth'
import { getFirebaseClient } from './firebase'

export type AuthUser = User

export function getCurrentUser(): AuthUser | null {
  return getFirebaseClient().auth.currentUser
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = getCurrentUser()
  if (!user) return null
  return await user.getIdToken(forceRefresh)
}

export function onAuthChange(cb: (user: AuthUser | null) => void): () => void {
  const { auth } = getFirebaseClient()
  const unsub = onAuthStateChanged(auth, (user) => cb(user))
  return () => unsub()
}

export async function signInWithPassword(email: string, password: string) {
  const { auth } = getFirebaseClient()
  return await signInWithEmailAndPassword(auth, email, password)
}

export async function signUpWithPassword(opts: {
  email: string
  password: string
  fullName?: string
}) {
  const { auth } = getFirebaseClient()
  const cred = await createUserWithEmailAndPassword(auth, opts.email, opts.password)
  if (opts.fullName?.trim()) {
    await updateProfile(cred.user, { displayName: opts.fullName.trim() })
  }
  try {
    await sendEmailVerification(cred.user, { url: `${window.location.origin}/login` })
  } catch {
    // ignore: email verification is recommended but not required for all environments
  }
  return cred
}

export async function signInWithGoogle() {
  const { auth } = getFirebaseClient()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return await signInWithPopup(auth, provider)
}

export async function signOut() {
  const { auth } = getFirebaseClient()
  await firebaseSignOut(auth)
}

export async function requestPasswordReset(email: string) {
  const { auth } = getFirebaseClient()
  const url = `${window.location.origin}/reset-password`
  await sendPasswordResetEmail(auth, email, { url, handleCodeInApp: false })
}

export async function finishPasswordReset(oobCode: string, newPassword: string) {
  const { auth } = getFirebaseClient()
  await confirmPasswordReset(auth, oobCode, newPassword)
}


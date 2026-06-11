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

let waitForAuthStateOncePromise: Promise<AuthUser | null> | null = null

export function waitForAuthStateOnce(timeoutMs = 1500): Promise<AuthUser | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (waitForAuthStateOncePromise) return waitForAuthStateOncePromise

  waitForAuthStateOncePromise = new Promise<AuthUser | null>((resolve) => {
    const { auth } = getFirebaseClient()
    let done = false

    const cleanup = (result: AuthUser | null) => {
      if (done) return
      done = true
      try {
        unsub()
      } catch {
        // ignore
      }
      resolve(result)
    }

    const unsub = onAuthStateChanged(auth, (user) => cleanup(user))
    window.setTimeout(() => cleanup(auth.currentUser), timeoutMs)
  })

  return waitForAuthStateOncePromise
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  let user = getCurrentUser()
  if (!user) {
    user = await waitForAuthStateOnce()
  }
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
  const cred = await signInWithEmailAndPassword(auth, email, password)
  if (typeof window !== 'undefined') {
    localStorage.setItem('fresh_logged_in', 'true')
  }
  return cred
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
  if (typeof window !== 'undefined') {
    localStorage.setItem('fresh_logged_in', 'true')
  }
  return cred
}

export async function signInWithGoogle() {
  const { auth } = getFirebaseClient()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const cred = await signInWithPopup(auth, provider)
  if (typeof window !== 'undefined') {
    localStorage.setItem('fresh_logged_in', 'true')
  }
  return cred
}

export async function signOut() {
  const { auth } = getFirebaseClient()
  await firebaseSignOut(auth)
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fresh_logged_in')
    localStorage.removeItem('fresh_role')
  }
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








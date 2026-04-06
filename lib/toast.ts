export type AppToastType = 'success' | 'error' | 'info' | 'warning' | 'loading'

export type AppToastOptions = {
  id?: string
  duration?: number
}

export type AppToast = {
  id: string
  type: AppToastType
  message: string
}

type Listener = (toasts: AppToast[]) => void

const toasts: AppToast[] = []
const listeners = new Set<Listener>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()

const DEFAULT_DURATION = 3000

function emit() {
  const snapshot = [...toasts]
  listeners.forEach((listener) => listener(snapshot))
}

function clearToastTimer(id: string) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

function scheduleDismiss(id: string, duration?: number) {
  if (duration === 0 || duration === Infinity) return
  const ms = typeof duration === 'number' ? duration : DEFAULT_DURATION
  clearToastTimer(id)
  const timer = setTimeout(() => {
    dismissToast(id)
  }, ms)
  timers.set(id, timer)
}

function upsertToast(type: AppToastType, message: string, options?: AppToastOptions): string {
  const id = options?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const idx = toasts.findIndex((t) => t.id === id)
  const next: AppToast = { id, type, message }

  if (idx >= 0) {
    toasts[idx] = next
  } else {
    toasts.push(next)
  }

  if (type === 'loading') {
    clearToastTimer(id)
  } else {
    scheduleDismiss(id, options?.duration)
  }

  emit()
  return id
}

function dismissToast(id?: string) {
  if (!id) {
    toasts.splice(0, toasts.length)
    timers.forEach((timer) => clearTimeout(timer))
    timers.clear()
    emit()
    return
  }

  const idx = toasts.findIndex((t) => t.id === id)
  if (idx >= 0) {
    toasts.splice(idx, 1)
    clearToastTimer(id)
    emit()
  }
}

export const toast = {
  success(message: string, options?: AppToastOptions) {
    return upsertToast('success', message, options)
  },
  error(message: string, options?: AppToastOptions) {
    return upsertToast('error', message, options)
  },
  info(message: string, options?: AppToastOptions) {
    return upsertToast('info', message, options)
  },
  warning(message: string, options?: AppToastOptions) {
    return upsertToast('warning', message, options)
  },
  loading(message: string, options?: AppToastOptions) {
    return upsertToast('loading', message, options)
  },
  dismiss(id?: string) {
    dismissToast(id)
  },
}

export function subscribeToToasts(listener: Listener) {
  listeners.add(listener)
  listener([...toasts])
  return () => {
    listeners.delete(listener)
  }
}

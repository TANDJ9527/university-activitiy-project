import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ToastKind = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  message: string
  kind: ToastKind
}

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, kind: ToastKind = 'info', durationMs = 2800) => {
    const id = ++toastId
    setItems((prev) => [...prev, { id, message, kind }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, durationMs)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-lg ring-1 backdrop-blur-md ${
              t.kind === 'success'
                ? 'bg-emerald-50/95 text-emerald-900 ring-emerald-200/80'
                : t.kind === 'error'
                  ? 'bg-red-50/95 text-red-900 ring-red-200/80'
                  : 'bg-slate-900/90 text-white ring-slate-700/50'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

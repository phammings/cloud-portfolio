import type { Session } from './adminApi'

/** Runs an action with the current session; resolves true if it succeeded. */
export type Act = (success: string, action: (session: Session) => Promise<unknown>) => Promise<boolean>

export const inputClass =
  'w-full border border-line bg-panel px-3 py-2 text-sm text-paper placeholder:text-dim focus:border-muted focus:outline-none'

export const buttonClass = (variant: 'primary' | 'ghost' | 'danger') =>
  `inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition disabled:cursor-not-allowed ${
    {
      primary: 'bg-paper text-ink hover:opacity-80',
      ghost: 'border border-line text-muted hover:border-paper hover:text-paper',
      danger: 'border border-red-400/50 text-red-300 hover:bg-red-400/10',
    }[variant]
  }`

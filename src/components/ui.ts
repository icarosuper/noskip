import { cn } from '#/lib/cn'

// Class recipes shared by links and buttons, so a <Link> and a <button> can look the same.

export function segmentClass(isActive: boolean) {
  return cn(
    'flex h-9 flex-1 items-center justify-center rounded-[9px] text-sm font-semibold transition-colors',
    isActive ? 'bg-accent text-accent-contrast' : 'text-muted hover:text-text',
  )
}

export const segmentGroupClass = 'flex gap-1 rounded-xl bg-surface p-1'

export function chipClass(isActive: boolean) {
  return cn(
    'flex h-8 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
    isActive ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-muted hover:text-text',
  )
}

export const primaryButtonClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold text-accent-contrast disabled:opacity-50'

export const secondaryButtonClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-surface px-4 font-semibold text-text hover:bg-surface-2 disabled:opacity-50'

export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-text placeholder:text-muted focus:border-accent focus:outline-none'

export const sectionTitleClass = 'font-display text-lg font-bold tracking-tight'

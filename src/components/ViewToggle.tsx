import { LayoutGrid, List } from 'lucide-react'
import { cn } from '#/lib/cn'
import { saveViewPreference, type ViewScope } from './view-preference'

const OPTIONS = [
  { value: 'list', label: 'List view', Icon: List },
  { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
] as const

// Two copies, one per state; CSS shows the one matching the current view (view-preference.ts), so
// `aria-pressed` is right without React knowing the saved choice. Must sit inside the screen's
// `data-view-scope` element.
export function ViewToggle({ scope }: { scope: ViewScope }) {
  return (
    <>
      {OPTIONS.map((pressed) => (
        <div
          key={pressed.value}
          className={cn('flex gap-1 rounded-xl bg-surface p-1', `view-${pressed.value}-only`)}
        >
          {OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={pressed.value === value}
              onClick={() => saveViewPreference(scope, value)}
              className={cn(
                'flex size-9 items-center justify-center rounded-[9px]',
                pressed.value === value ? 'bg-surface-2 text-text' : 'text-muted hover:text-text',
              )}
            >
              <Icon aria-hidden="true" className="size-[18px]" />
            </button>
          ))}
        </div>
      ))}
    </>
  )
}

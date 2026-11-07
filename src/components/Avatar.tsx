import { cn } from '#/lib/cn'

export function Avatar({
  image,
  name,
  className,
}: {
  image: string | null
  name: string
  className?: string
}) {
  if (image) return <img src={image} alt="" className={cn('rounded-full object-cover', className)} />
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center rounded-full bg-accent-soft font-display font-bold text-accent-text',
        className,
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

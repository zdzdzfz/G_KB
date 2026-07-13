import clsx from 'clsx'

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'danger'
}

export function IconButton({ className, variant = 'default', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
        variant === 'danger' && 'border-red-200 bg-white text-red-600 hover:bg-red-50',
        variant === 'default' && 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        className,
      )}
      {...props}
    />
  )
}

export function TextButton({ className, variant = 'default', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
        variant === 'danger' && 'border-red-200 bg-white text-red-600 hover:bg-red-50',
        variant === 'default' && 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        className,
      )}
      {...props}
    />
  )
}

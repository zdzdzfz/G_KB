import clsx from 'clsx'

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'danger' | 'toolbar'
}

export function IconButton({ className, variant = 'default', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-xs transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'border border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
        variant === 'danger' && 'border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50',
        variant === 'default' && 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900',
        variant === 'toolbar' && 'border border-transparent bg-transparent text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm',
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
        'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'border border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
        variant === 'danger' && 'border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50',
        variant === 'default' && 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900',
        variant === 'toolbar' && 'border border-transparent bg-transparent text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

import clsx from 'clsx'

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'danger' | 'toolbar' | 'toolbarPrimary' | 'toolbarMini' | 'toolbarMiniPrimary'
}

export function IconButton({ className, variant = 'default', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center justify-center rounded-md text-xs transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'h-8 w-8 border border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
        variant === 'danger' && 'h-8 w-8 border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50',
        variant === 'default' && 'h-8 w-8 border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900',
        variant === 'toolbar' && 'h-6 w-6 border border-transparent bg-transparent text-slate-500 hover:bg-white hover:text-slate-900',
        variant === 'toolbarPrimary' && 'h-6 w-6 border border-emerald-500 bg-emerald-600 text-white shadow-sm hover:bg-emerald-500',
        variant === 'toolbarMini' && 'h-5 w-5 border border-transparent bg-transparent text-slate-500 hover:bg-white hover:text-slate-900',
        variant === 'toolbarMiniPrimary' && 'h-5 w-5 border border-emerald-500 bg-emerald-600 text-white shadow-sm hover:bg-emerald-500',
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
        'inline-flex items-center gap-1.5 rounded-md whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'h-8 border border-emerald-600 bg-emerald-600 px-2.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700',
        variant === 'danger' && 'h-8 border border-red-200 bg-white px-2.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50',
        variant === 'default' && 'h-8 border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900',
        variant === 'toolbar' && 'h-6 border border-transparent bg-transparent px-1.5 text-[10px] font-semibold text-slate-600 hover:bg-white hover:text-slate-950',
        variant === 'toolbarPrimary' && 'h-6 border border-emerald-500 bg-emerald-600 px-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-emerald-500',
        variant === 'toolbarMini' && 'h-5 border border-transparent bg-transparent px-1 text-[9px] font-semibold text-slate-600 hover:bg-white hover:text-slate-950',
        variant === 'toolbarMiniPrimary' && 'h-5 border border-emerald-500 bg-emerald-600 px-1 text-[9px] font-semibold text-white shadow-sm hover:bg-emerald-500',
        className,
      )}
      {...props}
    />
  )
}

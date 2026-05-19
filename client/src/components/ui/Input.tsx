import * as React from "react"
import { cn } from "../../lib/cn"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-slate-200/90 bg-white/95 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400",
          "shadow-inner shadow-slate-900/[0.03]",
          "focus:outline-none focus:ring-2 focus:ring-indigo-400/45 focus:border-indigo-300/80 focus:bg-white",
          "transition-all duration-200 ease-out",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }

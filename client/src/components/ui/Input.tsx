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
          "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400",
          "transition-all duration-200 ease-out",
          "shadow-sm",
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
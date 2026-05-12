import * as React from "react"
import { cn } from "../../lib/cn"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400",
          "transition-all duration-200 ease-out",
          "shadow-sm",
          "resize-y",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
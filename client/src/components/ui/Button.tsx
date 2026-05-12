import * as React from "react"
import { cn } from "../../lib/cn"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "secondary" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = "default",
    size = "default",
    asChild = false,
    disabled,
    children,
    ...props
  }, ref) => {
    const baseStyles = cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "shadow-sm",
      {
        "bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-700 hover:to-sky-700 shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30": variant === "default",
        "bg-slate-100 text-slate-700 hover:bg-slate-200": variant === "secondary",
        "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300": variant === "outline",
        "hover:bg-slate-100 text-slate-700": variant === "ghost",
        "text-indigo-600 underline-offset-4 hover:underline": variant === "link",
      },
      {
        "h-10 px-4 py-2": size === "default",
        "h-9 rounded-md px-3": size === "sm",
        "h-11 rounded-xl px-8 text-base": size === "lg",
        "h-10 w-10": size === "icon",
      },
      className
    )

    if (asChild && React.Children.count(children) === 1) {
      const child = React.Children.only(children)
      return React.cloneElement(child as React.ReactElement<any>, {
        className: cn((child as React.ReactElement<any>).props.className, baseStyles),
        ref: ref as any,
        ...props,
      })
    }

    return (
      <button
        className={baseStyles}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button }
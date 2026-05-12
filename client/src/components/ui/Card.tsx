import * as React from "react"
import { cn } from "../../lib/cn"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-slate-100 bg-white text-slate-900 shadow-lg shadow-slate-900/5",
      "transition-all duration-300 ease-out",
      "hover:shadow-xl hover:shadow-indigo-500/10",
      "hover:border-indigo-200/50",
      className
    )}
    {...props}
  />
))

Card.displayName = "Card"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6", className)}
    {...props}
  />
))

CardContent.displayName = "CardContent"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-2 p-6", className)}
    {...props}
  />
))

CardHeader.displayName = "CardHeader"

export { Card, CardContent, CardHeader }
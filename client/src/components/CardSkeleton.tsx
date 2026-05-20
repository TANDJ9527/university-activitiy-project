export function CardSkeleton() {
  return (
    <div className="h-full min-h-[21rem] w-full animate-pulse overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-md ring-1 ring-slate-200/80">
      <div className="h-2.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
      <div className="space-y-4 p-5">
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded-full bg-slate-200/90" />
          <div className="h-7 w-24 rounded-full bg-slate-200/90" />
        </div>
        <div className="h-7 w-4/5 rounded-lg bg-slate-200/90" />
        <div className="space-y-2.5">
          <div className="h-3.5 w-full rounded-md bg-slate-100" />
          <div className="h-3.5 w-[92%] rounded-md bg-slate-100" />
          <div className="h-3.5 w-[85%] rounded-md bg-slate-100" />
        </div>
        <div className="mt-6 h-10 w-full rounded-xl bg-slate-200/80" />
      </div>
    </div>
  )
}

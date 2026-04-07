export function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white/80 shadow-md ring-1 ring-slate-200/80">
      <div className="h-1.5 bg-gradient-to-r from-slate-200 to-slate-300" />
      <div className="space-y-3 p-5">
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-slate-200" />
          <div className="h-5 w-24 rounded-full bg-slate-200" />
        </div>
        <div className="h-6 w-4/5 rounded-lg bg-slate-200" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-[90%] rounded bg-slate-100" />
        </div>
      </div>
    </div>
  )
}

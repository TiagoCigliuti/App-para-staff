export default function LoadingCuestionario() {
  return (
    <main className="min-h-[100dvh] px-4 py-6 md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  )
}

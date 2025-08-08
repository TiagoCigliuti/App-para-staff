export default function Loading() {
  // Suspense fallback for the "individualizada" planning route.
  // Keep it lightweight and accessible.
  return (
    <main
      className="p-6 space-y-6"
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando contenido de Planificación Individualizada"
    >
      <div className="h-8 w-56 rounded bg-gray-200 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="h-5 w-2/3 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-4/5 rounded bg-gray-100 animate-pulse" />
            <div className="h-24 rounded bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
      <p className="sr-only">{'Cargando…'}</p>
    </main>
  )
}

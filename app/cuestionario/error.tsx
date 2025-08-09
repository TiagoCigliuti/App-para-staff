"use client"

export default function ErrorCuestionario({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-md border p-6 space-y-3">
        <h2 className="text-xl font-semibold">Ocurrió un error</h2>
        <p className="text-sm text-muted-foreground">{error?.message || "Error inesperado al cargar la página."}</p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
        >
          Reintentar
        </button>
      </div>
    </main>
  )
}

export default function LoadingIndividualizada() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
    </div>
  )
}

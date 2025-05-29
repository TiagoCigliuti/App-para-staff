import EditarCliente from "@/components/admin/EditarCliente"

export default function EditarClientePage({ params }: { params: { id: string } }) {
  return <EditarCliente clienteId={params.id} />
}

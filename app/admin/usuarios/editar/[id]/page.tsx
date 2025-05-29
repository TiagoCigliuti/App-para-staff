import EditarUsuario from "@/components/admin/EditarUsuario"

export default function EditarUsuarioPage({ params }: { params: { id: string } }) {
  return <EditarUsuario usuarioId={params.id} />
}

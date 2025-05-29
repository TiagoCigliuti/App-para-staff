import EnDesarrollo from "@/components/ui/EnDesarrollo"

export default function ConfiguracionPage() {
  return (
    <EnDesarrollo
      titulo="Configuración del Sistema"
      descripcion="Panel de configuración avanzada para administradores."
      caracteristicas={[
        "Configuración de notificaciones",
        "Gestión de copias de seguridad",
        "Configuración de integrations",
        "Logs del sistema",
        "Configuración de seguridad",
        "Personalización de la aplicación",
      ]}
      fechaEstimada="Abril 2024"
      rutaVolver="/admin"
    />
  )
}

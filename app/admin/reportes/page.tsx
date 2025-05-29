import EnDesarrollo from "@/components/ui/EnDesarrollo"

export default function ReportesPage() {
  return (
    <EnDesarrollo
      titulo="Sistema de Reportes"
      descripcion="Generación de reportes y análisis de datos del sistema."
      caracteristicas={[
        "Reportes de actividad de usuarios",
        "Estadísticas de uso por cliente",
        "Exportación en múltiples formatos",
        "Gráficos y visualizaciones",
        "Reportes programados",
        "Dashboard de métricas en tiempo real",
      ]}
      fechaEstimada="Mayo 2024"
      rutaVolver="/admin"
    />
  )
}

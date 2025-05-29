"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Users, Trophy, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

interface Equipo {
  id: string
  nombre: string
  logoUrl?: string
  jugadores: number
  activo: boolean
  createdAt: any
}

export default function GestionEquiposPage() {
  const router = useRouter()
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredEquipos, setFilteredEquipos] = useState<Equipo[]>([])

  // Cargar equipos
  useEffect(() => {
    const fetchEquipos = async () => {
      try {
        setLoading(true)
        const equiposSnapshot = await getDocs(collection(db, "equipos"))
        const equiposData = equiposSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Equipo[]

        setEquipos(equiposData)
        setFilteredEquipos(equiposData)
      } catch (error) {
        console.error("Error al cargar equipos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEquipos()
  }, [])

  // Filtrar equipos
  useEffect(() => {
    const filtered = equipos.filter((equipo) => equipo.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    setFilteredEquipos(filtered)
  }, [searchTerm, equipos])

  const handleDeleteEquipo = async (equipoId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este equipo?")) {
      try {
        await deleteDoc(doc(db, "equipos", equipoId))
        setEquipos(equipos.filter((equipo) => equipo.id !== equipoId))
      } catch (error) {
        console.error("Error al eliminar equipo:", error)
      }
    }
  }

  const estadisticas = {
    totalEquipos: equipos.length,
    equiposActivos: equipos.filter((e) => e.activo).length,
    totalJugadores: equipos.reduce((sum, e) => sum + (e.jugadores || 0), 0),
    ligas: 0,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin")} className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Equipos</h1>
                <p className="text-gray-600">Administra clubes y equipos deportivos</p>
              </div>
            </div>

            <Button onClick={() => router.push("/admin/equipos/nuevo")}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Equipo
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Estadísticas */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Equipos</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.totalEquipos}</div>
              <p className="text-xs text-muted-foreground">{estadisticas.equiposActivos} activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jugadores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.totalJugadores}</div>
              <p className="text-xs text-muted-foreground">Total registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ligas</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.ligas}</div>
              <p className="text-xs text-muted-foreground">Diferentes competiciones</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticas.totalEquipos > 0
                  ? Math.round(estadisticas.totalJugadores / estadisticas.totalEquipos)
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">Jugadores por equipo</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y búsqueda */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Equipos Registrados</CardTitle>
            <CardDescription>Gestiona todos los equipos y clubes del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, ciudad o liga..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 animate-pulse rounded"></div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Jugadores</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipos.map((equipo) => (
                    <TableRow key={equipo.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          {equipo.logoUrl ? (
                            <img
                              src={equipo.logoUrl || "/placeholder.svg"}
                              alt={`Logo de ${equipo.nombre}`}
                              className="w-8 h-8 rounded-full object-contain border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <Trophy className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <span>{equipo.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>{equipo.jugadores || 0}</TableCell>
                      <TableCell>
                        <Badge variant={equipo.activo ? "default" : "secondary"}>
                          {equipo.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/admin/equipos/editar/${equipo.id}`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteEquipo(equipo.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!loading && filteredEquipos.length === 0 && (
              <div className="text-center py-8">
                <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay equipos</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? "No se encontraron equipos con ese criterio." : "Comienza creando tu primer equipo."}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <Button onClick={() => router.push("/admin/equipos/nuevo")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Equipo
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

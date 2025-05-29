"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "./ThemeProvider"
import { Palette, RotateCcw, Save } from "lucide-react"

export default function ThemeCustomizer() {
  const { theme, setTheme, resetTheme, isDefaultTheme } = useTheme()
  const [tempTheme, setTempTheme] = useState(theme)

  const handleColorChange = (colorKey: keyof typeof theme, value: string) => {
    setTempTheme((prev) => ({
      ...prev,
      [colorKey]: value,
    }))
  }

  const applyTheme = () => {
    setTheme(tempTheme)
  }

  const handleReset = () => {
    resetTheme()
    setTempTheme({
      background: "#ffffff",
      text: "#000000",
      primary: "#000000",
      secondary: "#cccccc",
      accent: "#cccccc",
      border: "#e5e5e5",
    })
  }

  const colorFields = [
    { key: "background" as const, label: "Fondo", description: "Color de fondo principal" },
    { key: "text" as const, label: "Texto", description: "Color del texto principal" },
    { key: "primary" as const, label: "Primario", description: "Color primario de la marca" },
    { key: "secondary" as const, label: "Secundario", description: "Color secundario" },
    { key: "accent" as const, label: "Acento", description: "Color de acento para destacar" },
    { key: "border" as const, label: "Bordes", description: "Color de los bordes" },
  ]

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Personalizar Tema</CardTitle>
          </div>
          {!isDefaultTheme && <Badge variant="secondary">Tema Personalizado</Badge>}
        </div>
        <CardDescription>
          Personaliza los colores del tema de tu aplicación. Los cambios se aplicarán en tiempo real.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {colorFields.map(({ key, label, description }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{label}</Label>
              <div className="flex space-x-2">
                <Input
                  id={key}
                  type="color"
                  value={tempTheme[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  type="text"
                  value={tempTheme[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <Label>Vista Previa</Label>
          <div
            className="p-4 rounded-lg border-2"
            style={{
              backgroundColor: tempTheme.background,
              color: tempTheme.text,
              borderColor: tempTheme.border,
            }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: tempTheme.primary }}>
              Título Principal
            </h3>
            <p className="mb-3">Este es un ejemplo de texto normal con el tema aplicado.</p>
            <div className="flex space-x-2">
              <div
                className="px-3 py-1 rounded text-sm"
                style={{
                  backgroundColor: tempTheme.primary,
                  color: tempTheme.background,
                }}
              >
                Botón Primario
              </div>
              <div
                className="px-3 py-1 rounded text-sm"
                style={{
                  backgroundColor: tempTheme.secondary,
                  color: tempTheme.text,
                }}
              >
                Botón Secundario
              </div>
              <div
                className="px-3 py-1 rounded text-sm"
                style={{
                  backgroundColor: tempTheme.accent,
                  color: tempTheme.text,
                }}
              >
                Acento
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset} disabled={isDefaultTheme}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restablecer
          </Button>
          <Button onClick={applyTheme}>
            <Save className="mr-2 h-4 w-4" />
            Aplicar Tema
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

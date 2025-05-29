"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface ThemeColors {
  background: string
  text: string
  primary: string
  secondary: string
  accent: string
  border: string
}

interface ThemeContextType {
  theme: ThemeColors
  setTheme: (newTheme: ThemeColors) => void
  resetTheme: () => void
  isDefaultTheme: boolean
}

const defaultTheme: ThemeColors = {
  background: "#ffffff",
  text: "#000000",
  primary: "#000000",
  secondary: "#cccccc",
  accent: "#cccccc",
  border: "#e5e5e5",
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeColors>(defaultTheme)

  const setTheme = (newTheme: ThemeColors) => {
    setThemeState(newTheme)
    localStorage.setItem("theme-cliente", JSON.stringify(newTheme))
  }

  const resetTheme = () => {
    setTheme(defaultTheme)
    localStorage.removeItem("theme-cliente")
  }

  const isDefaultTheme = JSON.stringify(theme) === JSON.stringify(defaultTheme)

  // Cargar desde localStorage al inicializar
  useEffect(() => {
    const stored = localStorage.getItem("theme-cliente")
    if (stored) {
      try {
        const parsedTheme = JSON.parse(stored)
        setThemeState(parsedTheme)
      } catch (error) {
        console.error("Error parsing stored theme:", error)
        setThemeState(defaultTheme)
      }
    }
  }, [])

  // Aplicar como variables CSS globales
  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty("--bg", theme.background)
    root.setProperty("--text", theme.text)
    root.setProperty("--primary", theme.primary)
    root.setProperty("--secondary", theme.secondary)
    root.setProperty("--accent", theme.accent)
    root.setProperty("--border", theme.border)

    // También aplicar a las variables de Tailwind CSS
    root.setProperty("--background", theme.background)
    root.setProperty("--foreground", theme.text)
    root.setProperty("--primary", theme.primary)
    root.setProperty("--primary-foreground", theme.background)
    root.setProperty("--secondary", theme.secondary)
    root.setProperty("--secondary-foreground", theme.text)
    root.setProperty("--accent", theme.accent)
    root.setProperty("--accent-foreground", theme.text)
    root.setProperty("--border", theme.border)
  }, [theme])

  const value = {
    theme,
    setTheme,
    resetTheme,
    isDefaultTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

export interface UserProfile {
  id: string
  email?: string
  phone?: string
  avatar: string | null
  avatarType: "preset" | "custom"
  userCode: string
  name: string
  points: number
  joinDate: string
  redeemedToday: number
  lastRedeemDate: string
}

export interface Notification {
  id: string
  title: string
  message: string
  fullMessage: string
  date: string
  read: boolean
}

export interface PurchaseRecord {
  id: string
  date: string
  invoiceNumber: string
  total: number
  pointsEarned: number
}

export interface RedeemableProduct {
  id: string
  name: string
  description: string
  pointsCost: number
  image: string
  category: string
}

export interface HomeBanner {
  id: string
  mediaUrl: string
  mediaType: "image" | "video"
  redirectType: "url" | "whatsapp"
  redirectUrl: string | null
  sortOrder: number
}

type AppScreen = "login" | "avatar-setup" | "welcome" | "main"
type MainTab = "home" | "history" | "redeemables"

interface AppState {
  screen: AppScreen
  mainTab: MainTab
  user: UserProfile | null
  notifications: Notification[]
  purchases: PurchaseRecord[]
  products: RedeemableProduct[]
  banners: HomeBanner[]
  showIOSTutorial: boolean
  setScreen: (screen: AppScreen) => void
  setMainTab: (tab: MainTab) => void
  setUser: (user: UserProfile | null) => void
  updateUser: (updates: Partial<UserProfile>) => void
  markNotificationRead: (id: string) => void
  dismissIOSTutorial: () => void
  redeemProduct: (
    product: RedeemableProduct,
  ) => Promise<{ success: boolean; code?: string; waitMinutes?: number; error?: string }>
  logout: () => void
  refreshData: () => Promise<void>
}

const AppContext = createContext<AppState | undefined>(undefined)

function isIOS(): boolean {
  if (typeof window === "undefined") return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone === true)
  )
}

async function fetchJson<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, options)
  let data: T | null = null

  try {
    data = (await response.json()) as T
  } catch {
    data = null
  }

  return { ok: response.ok, status: response.status, data }
}

function mapClientToUser(client: Record<string, unknown>): UserProfile {
  return {
    id: String(client.id || ""),
    email: client.email ? String(client.email) : undefined,
    phone: client.phone ? String(client.phone) : undefined,
    avatar: (client.avatar as string | null) || null,
    avatarType: (client.avatar_type as "preset" | "custom") || "preset",
    userCode: String(client.user_code || ""),
    name: String(client.full_name || ""),
    points: Number(client.points || 0),
    joinDate: String(client.created_at || new Date().toISOString()),
    redeemedToday: Number(client.redeemed_today || 0),
    lastRedeemDate: String(client.last_redeem_date || ""),
  }
}

function mapInvoicesToPurchases(invoices: Record<string, unknown>[]): PurchaseRecord[] {
  return invoices.map((invoice) => ({
    id: String(invoice.id),
    date: String(invoice.created_at),
    invoiceNumber: String(invoice.invoice_number || ""),
    total: Number(invoice.amount || 0),
    pointsEarned: Number(invoice.points_earned || 0),
  }))
}

function mapProducts(products: Record<string, unknown>[]): RedeemableProduct[] {
  return products.map((product) => {
    const category = product.categories as { name?: string; points_cost?: number } | null
    return {
      id: String(product.id),
      name: String(product.name || ""),
      description: String(product.description || ""),
      pointsCost: Number(category?.points_cost || product.points_cost || 0),
      image: String(product.image_url || "/placeholder.jpg"),
      category: String(category?.name || "General"),
    }
  })
}

function mapBanners(items: Record<string, unknown>[]): HomeBanner[] {
  return items.map((item) => ({
    id: String(item.id),
    mediaUrl: String(item.media_url || ""),
    mediaType: (item.media_type as "image" | "video") || "image",
    redirectType: (item.redirect_type as "url" | "whatsapp") || "url",
    redirectUrl: item.redirect_url ? String(item.redirect_url) : null,
    sortOrder: Number(item.sort_order || 0),
  }))
}

const sampleNotifications: Notification[] = [
  {
    id: "1",
    title: "Bienvenido a Sandeli",
    message: "Gracias por unirte a nuestro programa de fidelizacion.",
    fullMessage:
      "Gracias por unirte a nuestro programa de fidelizacion. Acumula puntos con cada compra y canjealos por tus productos favoritos.",
    date: new Date().toISOString(),
    read: false,
  },
  {
    id: "2",
    title: "Promociones activas",
    message: "Revisa los banners para ver promociones del momento.",
    fullMessage:
      "En la pantalla principal encontraras banners activos con promociones y accesos directos a informacion de Sandeli.",
    date: new Date(Date.now() - 86400000).toISOString(),
    read: false,
  },
]

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<AppScreen>("login")
  const [mainTab, setMainTab] = useState<MainTab>("home")
  const [user, setUserState] = useState<UserProfile | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications)
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [products, setProducts] = useState<RedeemableProduct[]>([])
  const [banners, setBanners] = useState<HomeBanner[]>([])
  const [showIOSTutorial, setShowIOSTutorial] = useState(false)

  const hydrateClientSession = useCallback(async () => {
    const me = await fetchJson<{ client?: Record<string, unknown> }>("/api/auth/client/me")
    if (!me.ok || !me.data?.client) {
      setUserState(null)
      setScreen("login")
      return
    }

    const mappedUser = mapClientToUser(me.data.client)
    setUserState(mappedUser)
    setScreen(mappedUser.avatar ? "main" : "avatar-setup")

    const tutorialDismissed = localStorage.getItem("sandeli_ios_tutorial_dismissed")
    if (isIOS() && !isStandalone() && !tutorialDismissed) {
      setShowIOSTutorial(true)
    }
  }, [])

  const loadCatalogData = useCallback(async () => {
    const [productsResponse, bannersResponse] = await Promise.all([
      fetchJson<{ products?: Record<string, unknown>[] }>("/api/products"),
      fetchJson<{ banners?: Record<string, unknown>[] }>("/api/banners"),
    ])

    if (productsResponse.ok && productsResponse.data?.products) {
      setProducts(mapProducts(productsResponse.data.products))
    }

    if (bannersResponse.ok && bannersResponse.data?.banners) {
      setBanners(mapBanners(bannersResponse.data.banners))
    }
  }, [])

  const loadPurchaseHistory = useCallback(async () => {
    const invoices = await fetchJson<{ invoices?: Record<string, unknown>[] }>("/api/invoices?me=true")
    if (invoices.ok && invoices.data?.invoices) {
      setPurchases(mapInvoicesToPurchases(invoices.data.invoices))
    } else if (invoices.status === 401) {
      setPurchases([])
    }
  }, [])

  const refreshData = useCallback(async () => {
    await Promise.all([hydrateClientSession(), loadCatalogData(), loadPurchaseHistory()])
  }, [hydrateClientSession, loadCatalogData, loadPurchaseHistory])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  useEffect(() => {
    if (!user) return
    loadPurchaseHistory()
  }, [loadPurchaseHistory, user])

  const setUser = useCallback((newUser: UserProfile | null) => {
    setUserState(newUser)
  }, [])

  const updateUser = useCallback((updates: Partial<UserProfile>) => {
    setUserState((previous) => {
      if (!previous) return previous
      return { ...previous, ...updates }
    })

    const payload: Record<string, unknown> = {}
    if (typeof updates.name === "string") payload.full_name = updates.name
    if (typeof updates.avatar === "string" || updates.avatar === null) payload.avatar = updates.avatar
    if (updates.avatarType === "custom" || updates.avatarType === "preset") {
      payload.avatar_type = updates.avatarType
    }

    if (Object.keys(payload).length > 0) {
      fetch("/api/auth/client/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
        .then((result) => {
          if (result.ok && result.data?.client) {
            setUserState(mapClientToUser(result.data.client))
          }
        })
        .catch(() => {
          // Ignore background profile sync errors.
        })
    }
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }, [])

  const dismissIOSTutorial = useCallback(() => {
    setShowIOSTutorial(false)
    localStorage.setItem("sandeli_ios_tutorial_dismissed", "true")
  }, [])

  const redeemProduct = useCallback(async (product: RedeemableProduct) => {
    const response = await fetchJson<{
      error?: string
      waitMinutes?: number
      code?: string
      redemption?: { code?: string }
    }>("/api/redemptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: product.id }),
    })

    if (!response.ok) {
      return {
        success: false,
        waitMinutes: response.data?.waitMinutes,
        error: response.data?.error || "No se pudo crear el canje.",
      }
    }

    await hydrateClientSession()
    return {
      success: true,
      code: response.data?.code || response.data?.redemption?.code,
    }
  }, [hydrateClientSession])

  const logout = useCallback(() => {
    fetch("/api/auth/client/logout", { method: "POST" }).catch(() => undefined)
    setUserState(null)
    setPurchases([])
    setScreen("login")
    setMainTab("home")
  }, [])

  const value = useMemo(
    () => ({
      screen,
      mainTab,
      user,
      notifications,
      purchases,
      products,
      banners,
      showIOSTutorial,
      setScreen,
      setMainTab,
      setUser,
      updateUser,
      markNotificationRead,
      dismissIOSTutorial,
      redeemProduct,
      logout,
      refreshData,
    }),
    [
      banners,
      dismissIOSTutorial,
      logout,
      mainTab,
      markNotificationRead,
      notifications,
      products,
      purchases,
      redeemProduct,
      refreshData,
      screen,
      setUser,
      showIOSTutorial,
      updateUser,
      user,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}

export { isIOS }

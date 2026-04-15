"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { BarChart3, Loader2, Save, Target, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar la informacion.")
  }
  return data
}

type GoalPeriod = "daily" | "weekly" | "biweekly" | "monthly"

type UserMetrics = {
  id: string
  authUserId: string
  email: string
  fullName: string
  role: "super_admin" | "gerente" | "supervisor" | "caja"
  isActive: boolean
  createdAt: string
  goals: {
    goalPeriod: GoalPeriod
    invoiceGoal: number
    clientGoal: number
    redemptionGoal: number
  }
  currentPeriod: {
    key: GoalPeriod
    label: string
    start: string
    end: string
    invoices: number
    clients: number
    redemptions: number
  }
  totals: {
    invoices: number
    clients: number
    redemptions: number
  }
}

type MetricsPayload = {
  viewer: {
    id: string | null
    role: "super_admin" | "gerente" | "supervisor" | "caja"
    full_name: string
  }
  goalsTableReady: boolean
  users: UserMetrics[]
  summary: {
    totalUsers: number
    activeUsers: number
    totalInvoices: number
    totalClients: number
    totalRedemptions: number
  }
}

type GoalDraft = {
  goalPeriod: GoalPeriod
  invoiceGoal: string
  clientGoal: string
  redemptionGoal: string
}

const PERIOD_OPTIONS: { value: GoalPeriod; label: string }[] = [
  { value: "daily", label: "Diaria" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
]

const ROLE_LABELS: Record<UserMetrics["role"], string> = {
  super_admin: "Super admin",
  gerente: "Gerente",
  supervisor: "Supervisor",
  caja: "Caja",
}

function getDraftFromUser(user: UserMetrics): GoalDraft {
  return {
    goalPeriod: user.goals.goalPeriod,
    invoiceGoal: String(user.goals.invoiceGoal),
    clientGoal: String(user.goals.clientGoal),
    redemptionGoal: String(user.goals.redemptionGoal),
  }
}

function getProgress(current: number, goal: number) {
  if (goal <= 0) return null
  return Math.min(100, Math.round((current / goal) * 100))
}

function MetricLine({
  label,
  current,
  total,
  goal,
}: {
  label: string
  current: number
  total: number
  goal: number
}) {
  const progress = getProgress(current, goal)

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-bold text-foreground">{current}</p>
          <p className="text-xs text-muted-foreground">Total historico: {total}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Meta</p>
          <p className="text-sm font-semibold text-primary">{goal}</p>
        </div>
      </div>
      {progress !== null && (
        <div className="mt-3 space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{progress}% de avance</p>
        </div>
      )}
    </div>
  )
}

export function AdminUserStatsBoard({
  editableGoals,
  showOwnSpotlight,
}: {
  editableGoals: boolean
  showOwnSpotlight: boolean
}) {
  const { data, error, isLoading, mutate } = useSWR<MetricsPayload>(
    "/api/admin-users/stats",
    fetcher,
    { refreshInterval: 30000 },
  )

  const [drafts, setDrafts] = useState<Record<string, GoalDraft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (!data?.users) return
    setDrafts((current) => {
      const next = { ...current }
      for (const user of data.users) {
        if (!next[user.id]) {
          next[user.id] = getDraftFromUser(user)
        }
      }
      return next
    })
  }, [data?.users])

  const ownUser = useMemo(() => {
    if (!showOwnSpotlight || !data?.viewer?.id) return null
    return data.users.find((user) => user.id === data.viewer.id) || null
  }, [data?.users, data?.viewer?.id, showOwnSpotlight])

  const orderedUsers = useMemo(() => {
    if (!data?.users) return []
    if (!ownUser) return data.users
    return [ownUser, ...data.users.filter((user) => user.id !== ownUser.id)]
  }, [data?.users, ownUser])

  const onSaveGoals = async (userId: string) => {
    const draft = drafts[userId]
    if (!draft) return

    setSavingId(userId)
    setFeedback(null)

    try {
      const response = await fetch("/api/admin-users/stats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_user_id: userId,
          goal_period: draft.goalPeriod,
          invoice_goal: Number(draft.invoiceGoal || 0),
          client_goal: Number(draft.clientGoal || 0),
          redemption_goal: Number(draft.redemptionGoal || 0),
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        setFeedback({ type: "error", message: result.error || "No se pudieron guardar las metas." })
        return
      }

      setFeedback({ type: "ok", message: "Metas actualizadas correctamente." })
      await mutate()
    } catch {
      setFeedback({ type: "error", message: "Error de conexion guardando las metas." })
    } finally {
      setSavingId(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Cargando metricas...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-3 text-sm text-red-700">{error.message}</CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col gap-6">
      {!data.goalsTableReady && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 text-sm text-amber-700">
            Para configurar metas por usuario debes ejecutar <strong>scripts/014_admin_user_goals.sql</strong>.
          </CardContent>
        </Card>
      )}

      {feedback && (
        <Card className={feedback.type === "ok" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
          <CardContent className={feedback.type === "ok" ? "py-3 text-sm text-emerald-700" : "py-3 text-sm text-red-700"}>
            {feedback.message}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Usuarios</p>
              <p className="text-2xl font-bold text-foreground">{data.summary.totalUsers}</p>
              <p className="text-xs text-muted-foreground">{data.summary.activeUsers} activos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Facturas</p>
              <p className="text-2xl font-bold text-foreground">{data.summary.totalInvoices}</p>
              <p className="text-xs text-muted-foreground">Historico del equipo</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Clientes</p>
              <p className="text-2xl font-bold text-foreground">{data.summary.totalClients}</p>
              <p className="text-xs text-muted-foreground">Registrados por usuarios</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Redenciones</p>
              <p className="text-2xl font-bold text-foreground">{data.summary.totalRedemptions}</p>
              <p className="text-xs text-muted-foreground">Codigos validados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {ownUser && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Mis metricas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <MetricLine
              label="Facturas"
              current={ownUser.currentPeriod.invoices}
              total={ownUser.totals.invoices}
              goal={ownUser.goals.invoiceGoal}
            />
            <MetricLine
              label="Clientes"
              current={ownUser.currentPeriod.clients}
              total={ownUser.totals.clients}
              goal={ownUser.goals.clientGoal}
            />
            <MetricLine
              label="Redenciones"
              current={ownUser.currentPeriod.redemptions}
              total={ownUser.totals.redemptions}
              goal={ownUser.goals.redemptionGoal}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {orderedUsers.map((user) => {
          const draft = drafts[user.id] || getDraftFromUser(user)
          const canEdit = editableGoals && data.viewer.role === "super_admin" && data.goalsTableReady
          const isOwnCard = ownUser?.id === user.id

          return (
            <Card key={user.id} className={isOwnCard && showOwnSpotlight ? "border-primary/30" : undefined}>
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{user.fullName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                    <Badge variant={user.isActive ? "default" : "outline"}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Periodo vigente: {user.currentPeriod.label}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <MetricLine
                    label="Facturas"
                    current={user.currentPeriod.invoices}
                    total={user.totals.invoices}
                    goal={user.goals.invoiceGoal}
                  />
                  <MetricLine
                    label="Clientes"
                    current={user.currentPeriod.clients}
                    total={user.totals.clients}
                    goal={user.goals.clientGoal}
                  />
                  <MetricLine
                    label="Redenciones"
                    current={user.currentPeriod.redemptions}
                    total={user.totals.redemptions}
                    goal={user.goals.redemptionGoal}
                  />
                </div>

                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Metas configuradas</p>
                      <p className="text-xs text-muted-foreground">
                        Ajusta el periodo y las metas de productividad para este usuario.
                      </p>
                    </div>
                    {canEdit ? (
                      <Button size="sm" onClick={() => onSaveGoals(user.id)} disabled={savingId === user.id}>
                        {savingId === user.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Guardar
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1 xl:col-span-1">
                      <Label>Periodo</Label>
                      <Select
                        value={draft.goalPeriod}
                        onValueChange={(value) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: { ...draft, goalPeriod: value as GoalPeriod },
                          }))
                        }
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Periodo" />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIOD_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Meta facturas</Label>
                      <Input
                        type="number"
                        min={0}
                        value={draft.invoiceGoal}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: { ...draft, invoiceGoal: event.target.value },
                          }))
                        }
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Meta clientes</Label>
                      <Input
                        type="number"
                        min={0}
                        value={draft.clientGoal}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: { ...draft, clientGoal: event.target.value },
                          }))
                        }
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Meta redenciones</Label>
                      <Input
                        type="number"
                        min={0}
                        value={draft.redemptionGoal}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [user.id]: { ...draft, redemptionGoal: event.target.value },
                          }))
                        }
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

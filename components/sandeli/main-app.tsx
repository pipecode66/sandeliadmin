"use client"

import { TopBar } from "./top-bar"
import { BottomNav } from "./bottom-nav"
import { HomeTab } from "./home-tab"
import { HistoryTab } from "./history-tab"
import { RedeemablesTab } from "./redeemables-tab"
import { IOSTutorial } from "./ios-tutorial"
import { useApp } from "@/lib/app-context"

export function MainApp() {
  const { mainTab } = useApp()

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar />

      <main className="flex flex-1 flex-col pt-2">
        {mainTab === "home" && <HomeTab />}
        {mainTab === "history" && <HistoryTab />}
        {mainTab === "redeemables" && <RedeemablesTab />}
      </main>

      <BottomNav />
      <IOSTutorial />
    </div>
  )
}

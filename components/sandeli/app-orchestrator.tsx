"use client"

import { useApp } from "@/lib/app-context"
import { LoginScreen } from "./login-screen"
import { AvatarSetupScreen } from "./avatar-setup-screen"
import { WelcomeScreen } from "./welcome-screen"
import { MainApp } from "./main-app"

export function AppOrchestrator() {
  const { screen } = useApp()

  switch (screen) {
    case "login":
      return <LoginScreen />
    case "avatar-setup":
      return <AvatarSetupScreen />
    case "welcome":
      return <WelcomeScreen />
    case "main":
      return <MainApp />
    default:
      return <LoginScreen />
  }
}

import { AppProvider } from "@/lib/app-context"
import { AppOrchestrator } from "@/components/sandeli/app-orchestrator"

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-md">
      <AppProvider>
        <AppOrchestrator />
      </AppProvider>
    </div>
  )
}

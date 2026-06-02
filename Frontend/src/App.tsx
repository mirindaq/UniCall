import { SessionConflictHandler } from "@/components/auth/SessionConflictHandler"
import useRouteElements from "@/routes/useRouteElements"

export function App() {
  const routeElements = useRouteElements()
  return (
    <>
      {routeElements}
      <SessionConflictHandler />
    </>
  )
}

export default App

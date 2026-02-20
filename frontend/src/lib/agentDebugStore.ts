interface AgentDebugEvent {
  source: string
  event: string
  sessionId?: string
  data?: Record<string, unknown>
  timestamp: number
}

const MAX_DEBUG_EVENTS = 600

const debugEvents: AgentDebugEvent[] = []

export function addAgentDebugEvent(event: AgentDebugEvent): void {
  debugEvents.push(event)
  if (debugEvents.length > MAX_DEBUG_EVENTS) {
    debugEvents.splice(0, debugEvents.length - MAX_DEBUG_EVENTS)
  }
}

export function getAgentDebugEvents(): AgentDebugEvent[] {
  return [...debugEvents]
}

export function clearAgentDebugEvents(): number {
  const count = debugEvents.length
  debugEvents.splice(0, debugEvents.length)
  return count
}

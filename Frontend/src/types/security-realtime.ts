export type SecurityRealtimeEventType = "LOGGED_IN_ELSEWHERE"

export interface SecurityRealtimeEvent {
  eventType: SecurityRealtimeEventType
  message: string
  sentAt: string
}

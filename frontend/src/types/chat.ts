export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface BrandonState {
  status: string
  notes: string
}

export interface ChatApiResponse {
  reply: string
  sessionId: string
  persona?: string
  brandonState?: BrandonState
  error?: string
}

export interface TypewriterTextProps {
  text: string
  responseKey?: string | number
  speed?: number
  className?: string
  onComplete?: () => void
  isLoading?: boolean
}

export interface HeroInputBarProps {
  isLoading: boolean
  disabled?: boolean
  onSend: (message: string) => Promise<void>
  onMicClick: () => void
  onInputFocusChange?: (focused: boolean) => void
  focusNonce?: number
}

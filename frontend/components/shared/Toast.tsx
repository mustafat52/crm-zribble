'use client'

import { useStore } from '@/store/useStore'

export default function Toast() {
  const toastMessage = useStore(s => s.toastMessage)
  if (!toastMessage) return null
  return <div className="toast">{toastMessage}</div>
}
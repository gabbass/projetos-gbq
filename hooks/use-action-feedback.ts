"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

type ActionFeedbackState = {
  status?: "success" | "error"
  message?: string
}

export function useActionFeedback(
  state: ActionFeedbackState,
  options: { onSuccess?: () => void } = {},
) {
  const previousState = useRef(state)
  const onSuccess = useRef(options.onSuccess)

  useEffect(() => {
    onSuccess.current = options.onSuccess
  }, [options.onSuccess])

  useEffect(() => {
    if (state === previousState.current || !state.message || !state.status) return
    previousState.current = state

    if (state.status === "error") {
      toast.error(state.message, { duration: Infinity })
      return
    }

    onSuccess.current?.()
    toast.success(state.message)
  }, [state])
}

export function useErrorFeedback(error?: string) {
  const previousError = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!error || error === previousError.current) return
    previousError.current = error
    toast.error(error, { duration: Infinity })
  }, [error])
}

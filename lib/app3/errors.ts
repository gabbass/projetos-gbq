export class App3ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(
    code: string,
    status: number,
    message = "Não foi possível concluir a operação no App3.",
  ) {
    super(message)
    this.name = "App3ApiError"
    this.code = code
    this.status = status
  }
}

export function publicApp3ErrorMessage(error: unknown) {
  if (error instanceof App3ApiError && error.status === 429) return "Muitas solicitações. Aguarde um instante e tente novamente."
  return "O WhatsApp está indisponível no momento. Tente novamente."
}

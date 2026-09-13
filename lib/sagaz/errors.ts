export class SagazApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(
    code: string,
    status: number,
    message = "Não foi possível concluir a operação no Sagaz.",
  ) {
    super(message)
    this.name = "SagazApiError"
    this.code = code
    this.status = status
  }
}

export function publicSagazErrorMessage(error: unknown) {
  if (error instanceof SagazApiError && error.status === 429) return "Muitas solicitações. Aguarde um instante e tente novamente."
  return "O WhatsApp está indisponível no momento. Tente novamente."
}

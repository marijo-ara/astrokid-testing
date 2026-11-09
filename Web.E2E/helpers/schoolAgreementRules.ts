/** Reglas espejo de `astro-kid-web` / backend para pruebas sin duplicar licencias. */

export type SendAgreementConflictCode =
  | 'SCHOOL_ALREADY_ACTIVE'
  | 'SCHOOL_PACKET_ALREADY_RECEIVED'
  | 'BCCR_RATE_UNAVAILABLE'

export type SendAgreementGuidance = {
  code?: string
  message_es?: string
  next_action?: string
}

export function schoolNameKey(name: string | null | undefined): string {
  return (name ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function schoolsMatchByName(a: string, b: string): boolean {
  return schoolNameKey(a) === schoolNameKey(b)
}

export function guidanceForSendAgreementConflict(code: string | undefined): string {
  switch (code) {
    case 'SCHOOL_ALREADY_ACTIVE':
      return 'Usá otro nombre o ampliá cupos en la licencia activa (PATCH seats); no reenvíes acuerdo.'
    case 'SCHOOL_PACKET_ALREADY_RECEIVED':
      return 'Aprobá en la cola de acuerdos; no reenvíes el formulario de alta.'
    case 'BCCR_RATE_UNAVAILABLE':
      return 'Revisá BCCR_API_TOKEN en Render antes de volver a enviar.'
    default:
      return 'Revisá el mensaje del backend o usá un nombre de colegio único en esta corrida.'
  }
}

export function formatSendAgreementHttpError(
  status: number,
  detail: SendAgreementGuidance | string | undefined
): string {
  if (typeof detail === 'string') {
    return `POST send-agreement → HTTP ${status}: ${detail}`
  }
  const parts = [detail?.code, detail?.message_es, detail?.next_action].filter(Boolean)
  const body = parts.length ? parts.join(' — ') : 'sin detalle'
  const hint = guidanceForSendAgreementConflict(detail?.code)
  return `POST send-agreement → HTTP ${status}: ${body}. ${hint}`
}

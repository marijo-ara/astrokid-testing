let lastPaymentReference = ''

export function setPremiumSinpePaymentReference(reference: string): void {
  lastPaymentReference = reference.trim()
}

export function peekPremiumSinpePaymentReference(): string {
  return lastPaymentReference
}

export function requirePremiumSinpePaymentReference(): string {
  if (!lastPaymentReference) {
    throw new Error('Sin referencia SINPE: ejecutá antes el paso de envío en /access.')
  }
  return lastPaymentReference
}

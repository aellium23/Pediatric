/** Domain events for the consultation lifecycle (decouples invoicing/notifications). */
export class ConsultationClosedEvent {
  constructor(public readonly consultationId: string) {}
}

export class PaymentCapturedEvent {
  constructor(
    public readonly consultationId: string,
    public readonly platformFeeCents: number,
    public readonly pediatricianAmount: number,
  ) {}
}

export class ConsultationExpiredEvent {
  constructor(public readonly consultationId: string) {}
}

export class MessageCreatedEvent {
  constructor(
    public readonly consultationId: string,
    public readonly messageId: string,
    public readonly senderUserId: string,
  ) {}
}

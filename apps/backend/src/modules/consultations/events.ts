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

/** A booked video consultation was refunded because the pediatrician removed
 *  the availability window — the family should be invited to rebook. */
export class ConsultationRebookOfferedEvent {
  constructor(
    public readonly consultationId: string,
    public readonly familyId?: string,
  ) {}
}

export class MessageCreatedEvent {
  constructor(
    public readonly consultationId: string,
    public readonly messageId: string,
    public readonly senderUserId: string,
  ) {}
}

/** A family started a paid consultation (message or video). Carries only the
 *  routing facts — no triage text, no clinical content. */
export class ConsultationStartedEvent {
  constructor(
    public readonly consultationId: string,
    public readonly userId: string,
    public readonly pediatricianId: string,
    public readonly type: string,
    public readonly priceCents: number,
    public readonly specialty?: string,
  ) {}
}

/** The pediatrician's first reply moved the consultation to ANSWERED. */
export class ConsultationAnsweredEvent {
  constructor(
    public readonly consultationId: string,
    public readonly pediatricianId?: string,
  ) {}
}

/** The family rated a closed consultation. */
export class ConsultationRatedEvent {
  constructor(
    public readonly consultationId: string,
    public readonly userId: string,
    public readonly pediatricianId: string,
    public readonly rating: number,
  ) {}
}

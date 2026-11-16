<?php

namespace App\Enums;

enum OrderStatus: string
{
    case PendingPayment = 'pending_payment';
    case Paid = 'paid';
    case Picking = 'picking';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case PaymentRefused = 'payment_refused';
    case PaymentFailed = 'payment_failed';
    case Expired = 'expired';
    case Cancelled = 'cancelled';

    /**
     * Single source of valid transitions (docs/planejamento/02-modelo-de-dados.md).
     *
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::PendingPayment => [self::Paid, self::PaymentRefused, self::PaymentFailed, self::Expired, self::Cancelled],
            // A new payment attempt reopens the order without creating another one.
            self::PaymentRefused, self::PaymentFailed, self::Expired => [self::PendingPayment, self::Cancelled],
            self::Paid => [self::Picking],
            self::Picking => [self::Shipped],
            self::Shipped => [self::Delivered],
            self::Delivered, self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }

    /**
     * Payment outcome is settled (the tracking screen can stop polling).
     */
    public function isPaymentFinal(): bool
    {
        return $this !== self::PendingPayment;
    }

    /**
     * Failure states where the customer may try another payment term.
     */
    public function canRetryPayment(): bool
    {
        return in_array($this, [self::PaymentRefused, self::PaymentFailed, self::Expired], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::PendingPayment => 'Aguardando pagamento',
            self::Paid => 'Pago',
            self::Picking => 'Em separação',
            self::Shipped => 'Enviado',
            self::Delivered => 'Entregue',
            self::PaymentRefused => 'Pagamento recusado',
            self::PaymentFailed => 'Falha no pagamento',
            self::Expired => 'Expirado',
            self::Cancelled => 'Cancelado',
        };
    }
}

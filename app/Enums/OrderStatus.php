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
}

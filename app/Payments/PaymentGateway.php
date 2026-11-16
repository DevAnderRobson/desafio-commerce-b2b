<?php

namespace App\Payments;

use App\Models\Order;
use App\Models\Payment;

interface PaymentGateway
{
    /**
     * @throws GatewayTransientError for temporary failures, which must be retried
     */
    public function charge(Order $order, Payment $payment): GatewayResult;
}

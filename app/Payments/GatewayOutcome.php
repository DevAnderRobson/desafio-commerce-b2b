<?php

namespace App\Payments;

enum GatewayOutcome: string
{
    case Approved = 'approved';
    case Refused = 'refused';
}

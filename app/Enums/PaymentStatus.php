<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Refused = 'refused';
    case Failed = 'failed';
}

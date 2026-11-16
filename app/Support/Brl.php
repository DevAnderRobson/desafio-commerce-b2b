<?php

namespace App\Support;

final class Brl
{
    /**
     * Formats cents as Brazilian reais ("R$ 1.234,56") for messages and e-mails.
     */
    public static function format(int $cents): string
    {
        return 'R$ '.number_format($cents / 100, 2, ',', '.');
    }
}

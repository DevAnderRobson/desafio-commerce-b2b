<?php

namespace App\Customers;

/**
 * CNPJ helpers: normalization to the stored mask and check-digit validation.
 */
final class Cnpj
{
    public static function digits(string $value): string
    {
        return (string) preg_replace('/\D/', '', $value);
    }

    /**
     * Stored format: 00.000.000/0000-00. Returns the input untouched when it is not 14 digits.
     */
    public static function format(string $value): string
    {
        $digits = self::digits($value);

        if (strlen($digits) !== 14) {
            return $value;
        }

        return sprintf(
            '%s.%s.%s/%s-%s',
            substr($digits, 0, 2),
            substr($digits, 2, 3),
            substr($digits, 5, 3),
            substr($digits, 8, 4),
            substr($digits, 12, 2),
        );
    }

    public static function isValid(string $value): bool
    {
        $digits = self::digits($value);

        if (strlen($digits) !== 14 || preg_match('/^(\d)\1{13}$/', $digits) === 1) {
            return false;
        }

        foreach ([12, 13] as $length) {
            $weight = $length - 7;
            $sum = 0;

            for ($i = 0; $i < $length; $i++) {
                $sum += (int) $digits[$i] * $weight;
                $weight = $weight === 2 ? 9 : $weight - 1;
            }

            $check = $sum % 11 < 2 ? 0 : 11 - ($sum % 11);

            if ((int) $digits[$length] !== $check) {
                return false;
            }
        }

        return true;
    }
}

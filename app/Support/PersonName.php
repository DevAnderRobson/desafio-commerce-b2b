<?php

namespace App\Support;

use Illuminate\Support\Str;

final class PersonName
{
    /**
     * "Maria Souza Lima" becomes "Maria L.": enough to tell people apart without exposing full names.
     */
    public static function short(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $first = $parts[0] !== '' ? $parts[0] : 'Cliente';

        return count($parts) > 1 ? $first.' '.Str::upper(Str::substr((string) end($parts), 0, 1)).'.' : $first;
    }
}

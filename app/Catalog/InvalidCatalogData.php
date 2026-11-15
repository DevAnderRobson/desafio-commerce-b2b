<?php

namespace App\Catalog;

use RuntimeException;

class InvalidCatalogData extends RuntimeException
{
    public static function missingFile(string $path): self
    {
        return new self("Catalog file not found: {$path}");
    }

    public static function malformedFile(string $path, string $reason): self
    {
        return new self("Catalog file {$path} is invalid: {$reason}");
    }
}

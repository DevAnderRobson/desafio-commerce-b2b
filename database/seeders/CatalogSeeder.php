<?php

namespace Database\Seeders;

use App\Catalog\CatalogImporter;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(CatalogImporter $importer): void
    {
        $report = $importer->import(database_path('seeders/data'));

        foreach ($report->warnings as $warning) {
            $this->command?->warn($warning);
        }
    }
}

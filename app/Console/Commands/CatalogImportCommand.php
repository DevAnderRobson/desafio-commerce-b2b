<?php

namespace App\Console\Commands;

use App\Catalog\CatalogImporter;
use App\Catalog\InvalidCatalogData;
use Illuminate\Console\Command;

class CatalogImportCommand extends Command
{
    protected $signature = 'catalog:import {--path= : Diretório com os JSONs do catálogo (padrão: database/seeders/data)}';

    protected $description = 'Carrega os JSONs do catálogo (produtos, preços, clientes, promoções, condições) no banco';

    public function handle(CatalogImporter $importer): int
    {
        $path = $this->option('path');
        $directory = is_string($path) && $path !== '' ? $path : database_path('seeders/data');

        try {
            $report = $importer->import($directory);
        } catch (InvalidCatalogData $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        foreach ($report->counts as $entity => $count) {
            $this->line(sprintf('%-20s %d', $entity, $count));
        }

        foreach ($report->warnings as $warning) {
            $this->warn($warning);
        }

        $this->info('Catalog imported'.($report->warnings === [] ? '.' : ' with '.count($report->warnings).' warning(s).'));

        return self::SUCCESS;
    }
}

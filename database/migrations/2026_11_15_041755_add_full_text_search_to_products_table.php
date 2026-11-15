<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Full-text search for the catalog (PostgreSQL only): accent-insensitive Portuguese vector
 * over name, brand and description, plus a trigram index on the name for typos and partial words.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS unaccent');
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // unaccent() is only STABLE; an IMMUTABLE wrapper is required for generated columns and indexes.
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
            LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
            AS $$ SELECT public.unaccent('public.unaccent', $1) $$
        SQL);

        DB::statement(<<<'SQL'
            ALTER TABLE products ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
                setweight(to_tsvector('portuguese', immutable_unaccent(coalesce(name, ''))), 'A') ||
                setweight(to_tsvector('portuguese', immutable_unaccent(coalesce(brand, ''))), 'B') ||
                setweight(to_tsvector('portuguese', immutable_unaccent(coalesce(description, ''))), 'C')
            ) STORED
        SQL);

        DB::statement('CREATE INDEX products_search_vector_idx ON products USING GIN (search_vector)');
        DB::statement('CREATE INDEX products_name_trgm_idx ON products USING GIN (lower(immutable_unaccent(name)) gin_trgm_ops)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS products_name_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS products_search_vector_idx');
        DB::statement('ALTER TABLE products DROP COLUMN IF EXISTS search_vector');
        DB::statement('DROP FUNCTION IF EXISTS immutable_unaccent(text)');
    }
};

<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo logins (password: "password"): one owner per imported company, one member for
 * the first company, and two pending registrations (one with a duplicated CNPJ).
 */
class DemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Customer::query()->orderBy('id')->get() as $customer) {
            User::factory()->ownerOf($customer)->create([
                'name' => "Dono {$customer->trade_name}",
                'email' => "dono{$customer->id}@example.com",
            ]);
        }

        $first = Customer::query()->orderBy('id')->first();

        if ($first !== null) {
            User::factory()->memberOf($first)->create([
                'name' => "Membro {$first->trade_name}",
                'email' => 'membro1@example.com',
            ]);

            $duplicate = Customer::factory()->pending()->create([
                'cnpj' => $first->cnpj,
                'legal_name' => 'Cadastro duplicado Ltda',
                'price_table_id' => $first->price_table_id,
                'duplicate_of_customer_id' => $first->id,
            ]);
            User::factory()->ownerOf($duplicate)->create(['name' => 'Solicitante duplicado', 'email' => 'duplicado@example.com']);
        }

        $pending = Customer::factory()->pending()->create(['legal_name' => 'Empresa Pendente Ltda', 'price_table_id' => $first?->price_table_id]);
        User::factory()->ownerOf($pending)->create(['name' => 'Dono Pendente', 'email' => 'pendente@example.com']);
    }
}

<?php

namespace App\Console\Commands;

use App\Customers\CustomerApproval;
use App\Enums\RejectionTemplate;
use App\Models\Customer;
use App\Models\PriceTable;
use Illuminate\Console\Command;
use InvalidArgumentException;

class CustomersApproveCommand extends Command
{
    protected $signature = 'customers:approve
        {customer? : ID da empresa (omita para listar as pendentes aguardando análise)}
        {--reject : Recusa o cadastro em vez de aprovar}
        {--template= : E-mail de recusa: default ou duplicate-owner}
        {--table=PADRAO : Código da tabela de preço atribuída na aprovação}';

    protected $description = 'Lista, aprova ou recusa cadastros de empresas (substitui o painel de gestão por enquanto)';

    public function handle(CustomerApproval $approval): int
    {
        $id = $this->argument('customer');

        if ($id === null) {
            return $this->listAwaitingReview();
        }

        $customer = Customer::query()->with('owner')->find($id);

        if ($customer === null) {
            $this->error("Empresa {$id} não encontrada.");

            return self::FAILURE;
        }

        try {
            return $this->option('reject')
                ? $this->reject($approval, $customer)
                : $this->approve($approval, $customer);
        } catch (InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }

    private function approve(CustomerApproval $approval, Customer $customer): int
    {
        $code = (string) $this->option('table');
        $table = PriceTable::query()->where('code', $code)->first();

        if ($table === null) {
            $this->error("Tabela de preço '{$code}' não existe.");

            return self::FAILURE;
        }

        $approval->approve($customer, $table);
        $this->info("Empresa {$customer->id} aprovada na tabela {$table->code}. E-mail enviado ao dono.");

        return self::SUCCESS;
    }

    private function reject(CustomerApproval $approval, Customer $customer): int
    {
        $template = RejectionTemplate::Default;

        if ($customer->isDuplicateRegistration()) {
            $this->warn("CNPJ duplicado: já existe a empresa {$customer->duplicate_of_customer_id} com este CNPJ.");

            $option = $this->option('template');
            $chosen = is_string($option) && $option !== '' ? $option : $this->askRejectionTemplate();
            $template = RejectionTemplate::tryFrom($chosen);

            if ($template === null) {
                $this->error("Template '{$chosen}' inválido. Use default ou duplicate-owner.");

                return self::FAILURE;
            }
        }

        $approval->reject($customer, $template);
        $this->info("Empresa {$customer->id} recusada (e-mail: {$template->value}).");

        return self::SUCCESS;
    }

    private function askRejectionTemplate(): string
    {
        $choice = $this->choice(
            'Qual e-mail de recusa enviar?',
            [RejectionTemplate::Default->value, RejectionTemplate::DuplicateOwner->value],
            RejectionTemplate::Default->value,
        );

        return is_string($choice) ? $choice : RejectionTemplate::Default->value;
    }

    private function listAwaitingReview(): int
    {
        $rows = Customer::query()
            ->awaitingReview()
            ->with('owner')
            ->orderBy('id')
            ->get()
            ->map(fn (Customer $customer): array => [
                $customer->id,
                $customer->cnpj,
                $customer->legal_name,
                $customer->owner?->email,
                $customer->isDuplicateRegistration() ? "DUPLICADO de #{$customer->duplicate_of_customer_id}" : '',
            ]);

        $this->table(['ID', 'CNPJ', 'Razão social', 'E-mail do dono', 'Alerta'], $rows);
        $this->line('Cadastros com e-mail do dono ainda não verificado não aparecem aqui.');

        return self::SUCCESS;
    }
}

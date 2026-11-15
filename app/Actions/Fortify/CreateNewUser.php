<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Customers\Cnpj;
use App\Enums\ApprovalStatus;
use App\Enums\CompanyRole;
use App\Models\Customer;
use App\Models\User;
use App\Rules\ValidCnpj;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

/**
 * Registers a company together with its first user, who becomes the company owner.
 * The company starts as pending and waits for the store owner's manual approval.
 */
class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'cnpj' => ['required', 'string', new ValidCnpj],
            'legal_name' => ['required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
        ])->validate();

        return DB::transaction(function () use ($input): User {
            $cnpj = Cnpj::format($input['cnpj']);

            // Never reveal that the CNPJ already exists: the sign-up proceeds exactly the same
            // way and the store owner sees the duplicate flag during review.
            $original = Customer::query()
                ->where('cnpj', $cnpj)
                ->whereNull('duplicate_of_customer_id')
                ->first();

            $customer = Customer::create([
                'cnpj' => $cnpj,
                'legal_name' => $input['legal_name'],
                'trade_name' => $input['trade_name'] ?? null,
                'approval_status' => ApprovalStatus::Pending,
                'duplicate_of_customer_id' => $original?->id,
            ]);

            $user = User::create([
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
                'customer_id' => $customer->id,
                'company_role' => CompanyRole::Owner,
            ]);

            return $user;
        });
    }
}

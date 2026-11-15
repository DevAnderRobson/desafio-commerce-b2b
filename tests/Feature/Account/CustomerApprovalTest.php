<?php

use App\Customers\CustomerApproval;
use App\Enums\ApprovalStatus;
use App\Enums\RejectionTemplate;
use App\Mail\CustomerApprovedMail;
use App\Mail\CustomerRejectedMail;
use App\Models\Customer;
use App\Models\PriceTable;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

function pendingCompany(bool $verified = true, ?Customer $duplicateOf = null): Customer
{
    $customer = Customer::factory()->pending()->create([
        'price_table_id' => null,
        'duplicate_of_customer_id' => $duplicateOf?->id,
    ]);
    $factory = $verified ? User::factory() : User::factory()->unverified();
    $factory->ownerOf($customer)->create();

    return $customer->fresh();
}

beforeEach(fn () => Mail::fake());

it('approves a pending company, assigns the price table and e-mails the owner', function () {
    $table = PriceTable::factory()->standard()->create();
    $customer = pendingCompany();

    app(CustomerApproval::class)->approve($customer, $table);

    expect($customer->fresh()->approval_status)->toBe(ApprovalStatus::Approved)
        ->and($customer->fresh()->price_table_id)->toBe($table->id)
        ->and($customer->fresh()->approved_at)->not->toBeNull();
    Mail::assertQueued(CustomerApprovedMail::class, fn ($mail) => $mail->hasTo($customer->owner->email));
});

it('rejects with the chosen template', function (RejectionTemplate $template) {
    $customer = pendingCompany();

    app(CustomerApproval::class)->reject($customer, $template);

    expect($customer->fresh()->approval_status)->toBe(ApprovalStatus::Rejected);
    Mail::assertQueued(CustomerRejectedMail::class, fn ($mail) => $mail->template === $template);
})->with([RejectionTemplate::Default, RejectionTemplate::DuplicateOwner]);

it('does not review a registration whose owner has not verified the e-mail', function () {
    $customer = pendingCompany(verified: false);

    app(CustomerApproval::class)->reject($customer);
})->throws(InvalidArgumentException::class);

it('does not review a company that was already decided', function () {
    $customer = Customer::factory()->create();
    User::factory()->ownerOf($customer)->create();

    app(CustomerApproval::class)->approve($customer, PriceTable::factory()->standard()->create());
})->throws(InvalidArgumentException::class);

it('only lists registrations with a verified owner e-mail as awaiting review', function () {
    $ready = pendingCompany();
    pendingCompany(verified: false);

    expect(Customer::awaitingReview()->pluck('id')->all())->toBe([$ready->id]);
});

it('does not tell the applicant the cnpj was duplicated in the default rejection mail', function () {
    $mail = new CustomerRejectedMail(pendingCompany(), RejectionTemplate::Default);

    $mail->assertDontSeeInHtml('CNPJ');
    $mail->assertDontSeeInHtml('administrador');
});

it('points the applicant to the company administrator in the duplicate-owner mail', function () {
    $mail = new CustomerRejectedMail(pendingCompany(), RejectionTemplate::DuplicateOwner);

    $mail->assertSeeInHtml('administrador da empresa');
});

it('approves through the command and lists awaiting registrations', function () {
    PriceTable::factory()->standard()->create();
    $customer = pendingCompany();

    $this->artisan('customers:approve')->expectsOutputToContain($customer->cnpj)->assertSuccessful();
    $this->artisan('customers:approve', ['customer' => $customer->id])->assertSuccessful();

    expect($customer->fresh()->approval_status)->toBe(ApprovalStatus::Approved);
});

it('asks which rejection mail to send for a duplicated cnpj', function () {
    $original = Customer::factory()->create();
    $duplicate = pendingCompany(duplicateOf: $original);

    $this->artisan('customers:approve', ['customer' => $duplicate->id, '--reject' => true])
        ->expectsOutputToContain("já existe a empresa {$original->id}")
        ->expectsChoice('Qual e-mail de recusa enviar?', 'duplicate-owner', ['default', 'duplicate-owner'])
        ->assertSuccessful();

    Mail::assertQueued(CustomerRejectedMail::class, fn ($mail) => $mail->template === RejectionTemplate::DuplicateOwner);
});

it('fails clearly for unknown companies, price tables and templates', function () {
    $duplicate = pendingCompany(duplicateOf: Customer::factory()->create());

    $this->artisan('customers:approve', ['customer' => 9999])->assertFailed();
    $this->artisan('customers:approve', ['customer' => $duplicate->id, '--table' => 'NAOEXISTE'])->assertFailed();
    $this->artisan('customers:approve', ['customer' => $duplicate->id, '--reject' => true, '--template' => 'xpto'])->assertFailed();
});

<?php

namespace App\Customers;

use App\Enums\ApprovalStatus;
use App\Enums\RejectionTemplate;
use App\Mail\CustomerApprovedMail;
use App\Mail\CustomerRejectedMail;
use App\Models\Customer;
use App\Models\PriceTable;
use Illuminate\Support\Facades\Mail;
use InvalidArgumentException;

/**
 * Store-owner decisions about company registrations. Until the management panel exists
 * this is driven by the `customers:approve` command.
 */
class CustomerApproval
{
    public function approve(Customer $customer, PriceTable $priceTable): void
    {
        $this->assertReviewable($customer);

        $customer->update([
            'approval_status' => ApprovalStatus::Approved,
            'approved_at' => now(),
            'price_table_id' => $priceTable->id,
        ]);

        $this->notifyOwner($customer, new CustomerApprovedMail($customer));
    }

    public function reject(Customer $customer, RejectionTemplate $template = RejectionTemplate::Default): void
    {
        $this->assertReviewable($customer);

        $customer->update(['approval_status' => ApprovalStatus::Rejected, 'approved_at' => null]);

        $this->notifyOwner($customer, new CustomerRejectedMail($customer, $template));
    }

    private function assertReviewable(Customer $customer): void
    {
        if ($customer->approval_status !== ApprovalStatus::Pending) {
            throw new InvalidArgumentException('Only pending registrations can be reviewed.');
        }

        if (! $customer->owner?->hasVerifiedEmail()) {
            throw new InvalidArgumentException('The owner must verify the e-mail before the registration is reviewed.');
        }
    }

    private function notifyOwner(Customer $customer, CustomerApprovedMail|CustomerRejectedMail $mail): void
    {
        $owner = $customer->owner;

        if ($owner !== null) {
            Mail::to($owner->email)->queue($mail);
        }
    }
}

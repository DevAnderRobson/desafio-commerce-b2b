<?php

namespace App\Enums;

/**
 * E-mail sent to the applicant when a registration is rejected. For duplicated CNPJs the
 * store owner chooses between the generic message and the one pointing to the company admin.
 */
enum RejectionTemplate: string
{
    case Default = 'default';
    case DuplicateOwner = 'duplicate-owner';
}

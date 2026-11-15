<?php

namespace App\Http\Controllers\Account;

use App\Enums\CompanyRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\StoreCompanyUserRequest;
use App\Mail\CompanyUserInvitedMail;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Company users panel. Only the company owner can list and link users, and linked users
 * are approved by the owner alone, without the store owner's review.
 */
class CompanyUserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('manage-company-users');

        return Inertia::render('account/users/index', [
            'users' => $request->user()->customer->users()
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'company_role'])
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->company_role?->value,
                ]),
        ]);
    }

    public function store(StoreCompanyUserRequest $request): RedirectResponse
    {
        $customer = $request->user()->customer;

        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => Str::random(40),
            'customer_id' => $customer->id,
            'company_role' => CompanyRole::Member,
        ]);

        // The owner vouches for the e-mail; the invited person proves access by setting the password.
        $user->forceFill(['email_verified_at' => now()])->save();

        $token = Password::broker()->createToken($user);
        $url = route('password.reset', ['token' => $token, 'email' => $user->email]);

        Mail::to($user->email)->queue(new CompanyUserInvitedMail($customer, $url));

        return to_route('account.users.index')->with('status', 'Convite enviado.');
    }
}

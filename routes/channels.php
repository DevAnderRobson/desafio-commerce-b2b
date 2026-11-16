<?php

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('orders.{number}', function (User $user, string $number): bool {
    return $user->customer_id !== null && Order::query()->where('number', $number)->where('customer_id', $user->customer_id)->exists();
});

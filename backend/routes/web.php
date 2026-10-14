<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/password/reset/{token}', function (Request $request, string $token) {
    $query = http_build_query(['email' => $request->query('email')]);
    $url = rtrim((string) config('app.frontend_url'), '/')
        .'/reinitialisation/'.rawurlencode($token)
        .($query === '' ? '' : '?'.$query);

    return redirect()->away($url);
})->name('password.reset');

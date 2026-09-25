<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('conversions/all', 'all-video')->name('conversions.all');
});

Route::middleware(['auth'])->group(function () {
    Route::inertia('converter', 'dashboard')->name('converter');
});

require __DIR__.'/settings.php';

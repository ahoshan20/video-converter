<?php

use App\Http\Controllers\Api\VideoConversionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::post('/videos/upload', [VideoConversionController::class, 'upload'])->name('api.videos.upload');
    Route::post('/conversions', [VideoConversionController::class, 'store'])->name('api.conversions.store');
    Route::get('/conversions', [VideoConversionController::class, 'index'])->name('api.conversions.index');
    Route::get('/conversions/{conversion}', [VideoConversionController::class, 'show'])->name('api.conversions.show');
    Route::delete('/conversions/{conversion}', [VideoConversionController::class, 'destroy'])->name('api.conversions.destroy');
    Route::get('/conversions/{conversion}/download', [VideoConversionController::class, 'download'])->name('api.conversions.download');
    Route::get('/all-conversions', [VideoConversionController::class, 'allConversions'])->name('api.conversions.all');
});

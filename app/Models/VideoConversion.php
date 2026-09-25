<?php

namespace App\Models;

use App\Enums\VideoConversionStatus;
use Database\Factories\VideoConversionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VideoConversion extends Model
{
    /** @use HasFactory<VideoConversionFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'original_filename',
        'input_path',
        'output_filename',
        'output_path',
        'input_size',
        'output_size',
        'status',
        'progress',
        'error_message',
        'profile',
        'started_at',
        'completed_at',
        'cancel_requested',
    ];

    protected function casts(): array
    {
        return [
            'status' => VideoConversionStatus::class,
            'input_size' => 'integer',
            'output_size' => 'integer',
            'progress' => 'integer',
            'cancel_requested' => 'boolean',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

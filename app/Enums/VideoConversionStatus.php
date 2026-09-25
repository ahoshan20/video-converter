<?php

namespace App\Enums;

enum VideoConversionStatus: string
{
    case Waiting = 'waiting';
    case Queued = 'queued';
    case Converting = 'converting';
    case Completed = 'completed';
    case Failed = 'failed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Waiting => 'Waiting',
            self::Queued => 'Waiting',
            self::Converting => 'Converting',
            self::Completed => 'Completed',
            self::Failed => 'Failed',
            self::Cancelled => 'Cancelled',
        };
    }
}

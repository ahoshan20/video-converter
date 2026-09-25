<?php

namespace App\Jobs;

use App\Enums\VideoConversionStatus;
use App\Models\VideoConversion;
use App\Services\FfmpegService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class ConvertVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, SerializesModels;

    public function __construct(public VideoConversion $conversion)
    {
    }

    public function handle(FfmpegService $ffmpeg): void
    {
        if (! $ffmpeg->isAvailable()) {
            $this->conversion->status = VideoConversionStatus::Failed;
            $this->conversion->error_message = 'FFmpeg and ffprobe must be installed and available on PATH.';
            $this->conversion->save();

            return;
        }

        $this->conversion->status = VideoConversionStatus::Converting;
        $this->conversion->started_at = now();
        $this->conversion->save();

        try {
            $ffmpeg->convert($this->conversion);
        } catch (Throwable $e) {
            $this->conversion->status = VideoConversionStatus::Failed;
            $this->conversion->error_message = 'Conversion failed. Please check the input file and try again.';
            $this->conversion->save();
        }
    }
}

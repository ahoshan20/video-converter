<?php

namespace Database\Factories;

use App\Enums\VideoConversionStatus;
use App\Models\VideoConversion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VideoConversion>
 */
class VideoConversionFactory extends Factory
{
    protected $model = VideoConversion::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'original_filename' => 'sample-video.mp4',
            'input_path' => 'video-converter/input/sample-video.mp4',
            'output_filename' => 'sample-video.3gp',
            'output_path' => 'video-converter/output/sample-video.3gp',
            'input_size' => 1024000,
            'output_size' => 512000,
            'status' => VideoConversionStatus::Waiting,
            'progress' => 0,
            'error_message' => null,
            'profile' => 'Symphony BL102',
            'started_at' => null,
            'completed_at' => null,
            'cancel_requested' => false,
        ];
    }
}

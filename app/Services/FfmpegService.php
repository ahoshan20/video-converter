<?php

namespace App\Services;

use App\Enums\VideoConversionStatus;
use App\Models\VideoConversion;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

class FfmpegService
{
    public const OUTPUT_PROFILE = [
        'name' => 'Symphony BL102',
        'container' => '3GP',
        'video_codec' => 'MPEG-4 Part 2',
        'resolution' => '320x240',
        'fps' => 15,
        'video_bitrate' => '300k',
        'audio_codec' => 'AAC',
        'audio_bitrate' => '64k',
        'audio_sample_rate' => 44100,
        'ffmpeg_args' => [
            '-vf', 'scale=320:240',
            '-r', '15',
            '-c:v', 'mpeg4',
            '-b:v', '300k',
            '-c:a', 'aac',
            '-b:a', '64k',
            '-ar', '44100',
            '-f', '3gp',
        ],
    ];

    public function isAvailable(): bool
    {
        return $this->hasCommand('ffmpeg') && $this->hasCommand('ffprobe');
    }

    public function hasCommand(string $name): bool
    {
        $process = Process::fromShellCommandline(sprintf('command -v %s >/dev/null 2>&1', escapeshellarg($name)));

        return $process->run() === 0;
    }

    public function durationSeconds(string $inputPath): ?float
    {
        $process = new Process(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', $inputPath]);
        $process->run();

        if (! $process->isSuccessful()) {
            return null;
        }

        $output = trim($process->getOutput());

        return is_numeric($output) ? (float) $output : null;
    }

    public function sanitizeInputFilename(string $name): string
    {
        $name = Str::ascii($name);
        $name = preg_replace('/[^A-Za-z0-9._-]+/', '-', $name);
        $name = trim($name, '.-_');

        return $name !== '' ? $name : 'video';
    }

    public function storeUploadedFile(string $originalName, \Illuminate\Http\UploadedFile $file): array
    {
        $safeName = $this->sanitizeInputFilename($originalName);
        $storage = Storage::disk('local');
        $relativeDir = 'video-converter/input';
        $storedName = $safeName;
        $counter = 1;

        while ($storage->exists($relativeDir.'/'.$storedName)) {
            $storedName = $this->generateUniqueFilename($safeName, $counter++);
        }

        $path = $storage->putFileAs($relativeDir, $file, $storedName);

        return [
            'input_path' => $path,
            'output_path' => str_replace('/input/', '/output/', $path),
            'output_filename' => pathinfo($storedName, PATHINFO_FILENAME).'.3gp',
        ];
    }

    protected function generateUniqueFilename(string $baseName, int $counter): string
    {
        $info = pathinfo($baseName);

        return $info['filename'].'-'.$counter.'.'.$info['extension'] ?? 'mp4';
    }

    public function createOutputPath(string $inputPath): array
    {
        $filename = pathinfo($inputPath, PATHINFO_FILENAME);

        return [
            'output_path' => 'video-converter/output/'.$filename.'.3gp',
            'output_filename' => $filename.'.3gp',
        ];
    }

    public function updateProgress(VideoConversion $conversion, int $progress, ?string $status = null): void
    {
        $conversion->progress = $progress;

        if ($status) {
            $conversion->status = $status;
        }

        $conversion->save();
    }

    public function convert(VideoConversion $conversion): void
    {
        $input = Storage::disk('local')->path($conversion->input_path);
        $output = Storage::disk('local')->path($conversion->output_path);

        $directory = dirname($output);
        if (! is_dir($directory)) {
            mkdir($directory, 0777, true);
        }

        $process = new Process([
            'ffmpeg',
            '-i', $input,
            '-vf', 'scale=320:240',
            '-r', '15',
            '-c:v', 'mpeg4',
            '-b:v', '300k',
            '-c:a', 'aac',
            '-b:a', '64k',
            '-ar', '44100',
            '-f', '3gp',
            $output,
        ]);

        $process->setTimeout(3600);
        $process->run(function ($type, $buffer) use ($conversion): void {
            $this->handleProgress($conversion, $buffer);
        });

        if (! $process->isSuccessful()) {
            $conversion->status = VideoConversionStatus::Failed;
            $conversion->error_message = trim($process->getErrorOutput()) ?: 'FFmpeg conversion failed.';
            $conversion->save();

            throw new ProcessFailedException($process);
                ;
        }

        $conversion->status = VideoConversionStatus::Completed;
        $conversion->progress = 100;
        $conversion->completed_at = now();
        $conversion->output_size = Storage::disk('local')->size($conversion->output_path);
        $conversion->save();
    }

    protected function handleProgress(VideoConversion $conversion, string $buffer): void
    {
        if ($conversion->status === VideoConversionStatus::Cancelled) {
            return;
        }

        $lines = preg_split('/\r\n|\r|\n/', $buffer);
        $time = null;

        foreach ($lines as $line) {
            if (preg_match('/time=(\d+):(\d+):(\d+\.\d+)/', $line, $matches)) {
                $time = ((int) $matches[1] * 3600) + ((int) $matches[2] * 60) + (float) $matches[3];
            }
        }

        if ($time === null) {
            return;
        }

        $duration = $this->durationSeconds(Storage::disk('local')->path($conversion->input_path));
        if ($duration === null || $duration <= 0) {
            return;
        }

        $progress = (int) min(100, max(0, round(($time / $duration) * 100)));

        if ($progress !== $conversion->progress) {
            $conversion->progress = $progress;
            $conversion->status = VideoConversionStatus::Converting;
            $conversion->save();
        }
    }
}

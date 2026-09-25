<?php

namespace App\Http\Controllers\Api;

use App\Enums\VideoConversionStatus;
use App\Http\Controllers\Controller;
use App\Jobs\ConvertVideoJob;
use App\Models\VideoConversion;
use App\Services\FfmpegService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class VideoConversionController extends Controller
{
    public function upload(Request $request, FfmpegService $ffmpeg): JsonResponse
    {
        Log::info('Video upload request received.', ['user_id' => $request->user()->id]);
        $request->validate([
            'videos' => ['required', 'array'],
            'videos.*' => ['file', 'mimes:mp4,mkv,avi,mov,webm,3gp,3gpp'],
        ]);

        $conversions = [];

        foreach ($request->file('videos', []) as $uploadedFile) {
            $this->assertValidVideoFile($uploadedFile);
            $paths = $ffmpeg->storeUploadedFile($uploadedFile->getClientOriginalName(), $uploadedFile);

            $conversion = VideoConversion::create([
                'user_id' => $request->user()->id,
                'original_filename' => $uploadedFile->getClientOriginalName(),
                'input_path' => $paths['input_path'],
                'output_filename' => $paths['output_filename'],
                'output_path' => $paths['output_path'],
                'input_size' => $uploadedFile->getSize(),
                'status' => VideoConversionStatus::Waiting,
                'progress' => 0,
                'profile' => 'Symphony BL102',
            ]);

            $conversions[] = $this->serializeConversion($conversion);
        }

        return response()->json([
            'data' => $conversions,
            'message' => 'Files queued for conversion.',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'conversions' => ['required', 'array'],
            'conversions.*' => ['integer', Rule::exists(VideoConversion::class, 'id')],
        ]);

        $queued = [];

        foreach ($request->input('conversions', []) as $id) {
            $conversion = VideoConversion::query()->where('user_id', $request->user()->id)->findOrFail($id);

            if ($conversion->status === VideoConversionStatus::Waiting || $conversion->status === VideoConversionStatus::Queued) {
                $conversion->status = VideoConversionStatus::Queued;
                $conversion->save();
                ConvertVideoJob::dispatch($conversion);
                $queued[] = $this->serializeConversion($conversion->fresh());
            }
        }

        return response()->json([
            'data' => $queued,
            'message' => count($queued) > 0 ? 'Conversion queued.' : 'No conversions queued.',
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $conversions = VideoConversion::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $conversions->map(fn ($conversion) => $this->serializeConversion($conversion)),
        ]);
    }

    public function show(Request $request, VideoConversion $conversion): JsonResponse
    {
        abort_unless($conversion->user_id === $request->user()->id, 403);

        return response()->json([
            'data' => $this->serializeConversion($conversion),
        ]);
    }

    public function destroy(Request $request, VideoConversion $conversion): JsonResponse
    {
        abort_unless($conversion->user_id === $request->user()->id, 403);

        if ($conversion->status === VideoConversionStatus::Converting) {
            $conversion->status = VideoConversionStatus::Cancelled;
            $conversion->cancel_requested = true;
            $conversion->save();

            return response()->json(['message' => 'Cancellation requested.']);
        }

        $conversion->delete();

        return response()->json(['message' => 'Conversion removed.']);
    }

    public function download(Request $request, VideoConversion $conversion): BinaryFileResponse|JsonResponse
    {
        abort_unless($conversion->user_id === $request->user()->id, 403);

        if ($conversion->status !== VideoConversionStatus::Completed) {
            return response()->json(['message' => 'Conversion is not complete.'], 400);
        }

        $path = Storage::disk('local')->path($conversion->output_path);

        if (! is_file($path)) {
            return response()->json(['message' => 'Output file not found.'], 404);
        }

        return response()->download($path, $conversion->output_filename, ['Content-Type' => 'video/3gpp']);
    }

    protected function serializeConversion(VideoConversion $conversion): array
    {
        return [
            'id' => $conversion->id,
            'original_filename' => $conversion->original_filename,
            'file_type' => pathinfo($conversion->original_filename, PATHINFO_EXTENSION),
            'input_path' => $conversion->input_path,
            'input_size' => $conversion->input_size,
            'output_filename' => $conversion->output_filename,
            'output_path' => $conversion->output_path,
            'output_size' => $conversion->output_size,
            'status' => $conversion->status->value,
            'progress' => $conversion->progress ?? 0,
            'error_message' => $conversion->error_message,
            'profile' => $conversion->profile,
            'created_at' => $conversion->created_at?->toISOString(),
            'updated_at' => $conversion->updated_at?->toISOString(),
            'can_download' => $conversion->status === VideoConversionStatus::Completed,
        ];
    }

    protected function assertValidVideoFile(UploadedFile $file): void
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $validExtensions = ['mp4', 'mkv', 'avi', 'mov', 'webm', '3gp', '3gpp'];

        if (! in_array($extension, $validExtensions, true)) {
            abort(422, 'Unsupported video format.');
        }

        if (! is_file($file->getPathname()) || $file->getSize() <= 0) {
            abort(422, 'Invalid video file.');
        }
    }
}

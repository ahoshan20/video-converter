<?php

use App\Enums\VideoConversionStatus;
use App\Models\User;
use App\Models\VideoConversion;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

it('creates conversion records for valid uploaded videos', function () {
    $user = User::factory()->create();
    Storage::fake('local');

    $response = $this->actingAs($user)
        ->postJson('/api/videos/upload', [
            'videos' => [
                UploadedFile::fake()->create('clip.mp4', 1024),
                UploadedFile::fake()->create('sample.mkv', 2048),
            ],
        ]);

    $response->assertOk();
    $this->assertDatabaseCount('video_conversions', 2);
    expect($response->json('data.0.original_filename'))->toBe('clip.mp4');
});

it('rejects non-video uploads', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/api/videos/upload', [
            'videos' => [UploadedFile::fake()->create('notes.txt', 256)],
        ]);

    $response->assertStatus(422);
});

it('dispatches conversion jobs for queued conversions', function () {
    Queue::fake();
    $user = User::factory()->create();
    $conversion = VideoConversion::factory()->for($user)->create([
        'status' => VideoConversionStatus::Queued,
    ]);

    $response = $this->actingAs($user)
        ->postJson('/api/conversions', [
            'conversions' => [$conversion->id],
        ]);

    $response->assertOk();
    Queue::assertPushed(\App\Jobs\ConvertVideoJob::class);
});

it('allows a user to download a completed conversion file', function () {
    $user = User::factory()->create();
    Storage::fake('local');
    $path = 'video-converter/output/demo.3gp';
    Storage::disk('local')->put($path, 'fake video');

    $conversion = VideoConversion::factory()->for($user)->create([
        'status' => VideoConversionStatus::Completed,
        'output_path' => $path,
        'output_filename' => 'demo.3gp',
    ]);

    $response = $this->actingAs($user)->get('/api/conversions/'.$conversion->id.'/download');

    $response->assertOk();
    $response->assertHeader('content-type', 'video/3gpp');
});

it('prevents downloading other users conversion files', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $conversion = VideoConversion::factory()->for($otherUser)->create([
        'status' => VideoConversionStatus::Completed,
        'output_path' => 'video-converter/output/other.3gp',
        'output_filename' => 'other.3gp',
    ]);

    Storage::fake('local');
    Storage::disk('local')->put('video-converter/output/other.3gp', 'demo');

    $response = $this->actingAs($user)->get('/api/conversions/'.$conversion->id.'/download');

    $response->assertForbidden();
});

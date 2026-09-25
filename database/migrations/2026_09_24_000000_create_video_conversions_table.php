<?php

use App\Enums\VideoConversionStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('video_conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('original_filename');
            $table->string('input_path');
            $table->string('output_filename')->nullable();
            $table->string('output_path')->nullable();
            $table->unsignedBigInteger('input_size')->nullable();
            $table->unsignedBigInteger('output_size')->nullable();
            $table->string('status')->default(VideoConversionStatus::Waiting->value);
            $table->boolean('is_downloaded')->default(false);
            $table->unsignedTinyInteger('progress')->default(0);
            $table->text('error_message')->nullable();
            $table->string('profile')->default('Symphony BL102');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->boolean('cancel_requested')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('video_conversions');
    }
};

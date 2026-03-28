"""
Kokoro TTS Voice Test — Baby Facts Long-Form Narration

Tests the top-tier female voices with a baby facts script sample.
Generates WAV files so you can compare quality for soothing narration.

Run with: PYTORCH_ENABLE_MPS_FALLBACK=1 python test_voices.py
"""

import os
import time
import soundfile as sf
import numpy as np

# Enable MPS fallback for Apple Silicon
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

from kokoro import KPipeline

# --- Test Script ---
# A realistic baby facts narration sample (~150 words, ~60 seconds of audio)
# This tests the voice at the tone and pacing we'd use for long-form baby content.

BABY_FACTS_SCRIPT = """
Here's something that might surprise you. Newborn babies can only see about eight to twelve inches in front of them. That's roughly the distance between a baby's face and their parent's face during feeding.

But here's where it gets really fascinating. Within just a few hours of being born, babies can already recognize their mother's face. Scientists believe this happens because babies spend so much time staring at that close-up view during those early feeding moments.

And it doesn't stop there. By the time a baby is three months old, their vision has developed enough to track moving objects across a room. Their little brains are building millions of new neural connections every single second.

Every time you smile at a baby, you're literally helping their brain grow.
"""

# --- Voices to Test ---
# Top-tier female voices suitable for calm, warm narration
VOICES = {
    "af_heart": "American Female — Grade A (flagship voice)",
    "af_bella": "American Female — Grade A- (extensively trained, warm)",
    "af_nicole": "American Female — Grade B- (well-trained, good quality)",
    "bf_emma": "British Female — Grade B- (warm British accent)",
}

def main():
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("KOKORO TTS VOICE TEST — Baby Facts Narration")
    print("=" * 60)

    # Initialize pipeline (American English)
    print("\nLoading Kokoro model...")
    start = time.time()
    pipeline_us = KPipeline(lang_code="a")  # American English
    pipeline_gb = KPipeline(lang_code="b")  # British English
    load_time = time.time() - start
    print(f"Model loaded in {load_time:.1f}s")

    results = []

    for voice_code, description in VOICES.items():
        print(f"\n--- Generating: {voice_code} ---")
        print(f"    {description}")

        # Pick the right pipeline based on voice prefix
        pipeline = pipeline_gb if voice_code.startswith("bf_") else pipeline_us

        start = time.time()
        audio_chunks = []
        chunk_count = 0

        # Generate audio (Kokoro yields chunks via generator)
        for gs, ps, audio in pipeline(BABY_FACTS_SCRIPT, voice=voice_code):
            audio_chunks.append(audio)
            chunk_count += 1

        gen_time = time.time() - start

        if not audio_chunks:
            print(f"    ERROR: No audio generated for {voice_code}")
            continue

        # Concatenate all chunks
        full_audio = np.concatenate(audio_chunks)
        duration = len(full_audio) / 24000  # 24kHz sample rate

        # Save
        output_path = os.path.join(output_dir, f"{voice_code}_baby_facts.wav")
        sf.write(output_path, full_audio, 24000)

        speed_factor = duration / gen_time if gen_time > 0 else 0
        results.append({
            "voice": voice_code,
            "description": description,
            "duration": duration,
            "gen_time": gen_time,
            "speed_factor": speed_factor,
            "chunks": chunk_count,
            "path": output_path,
        })

        print(f"    Duration: {duration:.1f}s")
        print(f"    Generated in: {gen_time:.1f}s ({speed_factor:.1f}x realtime)")
        print(f"    Chunks: {chunk_count}")
        print(f"    Saved: {output_path}")

    # --- Summary ---
    print("\n" + "=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    print(f"\nScript: ~{len(BABY_FACTS_SCRIPT.split())} words")
    print(f"Model load time: {load_time:.1f}s\n")

    print(f"{'Voice':<15} {'Duration':>10} {'Gen Time':>10} {'Speed':>8} {'File'}")
    print("-" * 70)
    for r in results:
        print(f"{r['voice']:<15} {r['duration']:>8.1f}s {r['gen_time']:>8.1f}s {r['speed_factor']:>6.1f}x   {os.path.basename(r['path'])}")

    print(f"\nAudio files saved to: {output_dir}/")
    print("Listen to each and pick the best voice for baby facts narration.")
    print("\nFor long-form cost comparison:")
    total_audio = sum(r["duration"] for r in results) / len(results) if results else 0
    words = len(BABY_FACTS_SCRIPT.split())
    words_per_sec = words / total_audio if total_audio > 0 else 2.5
    target_words = 2800
    estimated_duration_min = (target_words / words_per_sec) / 60
    avg_speed = sum(r["speed_factor"] for r in results) / len(results) if results else 1
    estimated_gen_min = estimated_duration_min / avg_speed

    print(f"  ~{words_per_sec:.1f} words/sec narration speed")
    print(f"  A 2800-word script would produce ~{estimated_duration_min:.0f} min of audio")
    print(f"  Estimated generation time: ~{estimated_gen_min:.0f} min")
    print(f"  Cost: $0.00")
    print(f"  (vs ElevenLabs: ~$5.00 per video)")


if __name__ == "__main__":
    main()

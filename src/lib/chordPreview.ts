/**
 * Web Audio chord preview — plays chord progressions using a simple synth.
 * Zero external dependencies.
 */

import type { ChordEntry } from "@/types";

// ── Pitch mapping ──

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

const QUALITY_INTERVALS: Record<string, number[]> = {
  maj:   [0, 4, 7],
  min:   [0, 3, 7],
  dim:   [0, 3, 6],
  aug:   [0, 4, 8],
  "7":   [0, 4, 7, 10],
  maj7:  [0, 4, 7, 11],
  min7:  [0, 3, 7, 10],
  dim7:  [0, 3, 6, 9],
  m7b5:  [0, 3, 6, 10],
  "9":   [0, 4, 7, 10, 14],
  maj9:  [0, 4, 7, 11, 14],
  min9:  [0, 3, 7, 10, 14],
  "11":  [0, 4, 7, 10, 14, 17],
  min11: [0, 3, 7, 10, 14, 17],
  "13":  [0, 4, 7, 10, 14, 21],
  sus2:  [0, 2, 7],
  sus4:  [0, 5, 7],
  add9:  [0, 4, 7, 14],
  "6":   [0, 4, 7, 9],
  min6:  [0, 3, 7, 9],
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function chordToMidi(root: string, quality: string, octave: number = 4): number[] {
  const rootSemitone = NOTE_TO_SEMITONE[root] ?? 0;
  const intervals = QUALITY_INTERVALS[quality] || QUALITY_INTERVALS["maj"];
  const baseMidi = 12 * (octave + 1) + rootSemitone; // octave 4 => C4=60
  return intervals.map((i) => baseMidi + i);
}

// ── Audio engine ──

let audioCtx: AudioContext | null = null;
let stopFlag = false;

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playChord(
  ctx: AudioContext,
  notes: number[],
  startTime: number,
  duration: number,
  volume: number = 0.08,
) {
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  // Soft envelope
  const attack = 0.05;
  const release = Math.min(0.3, duration * 0.3);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + attack);
  gain.gain.setValueAtTime(volume, startTime + duration - release);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  for (const midi of notes) {
    const osc = ctx.createOscillator();
    osc.type = "sine"; // Clean, piano-like
    osc.frequency.value = midiToFreq(midi);
    osc.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);

    // Add a softer triangle wave layer for warmth
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = midiToFreq(midi);
    const subGain = ctx.createGain();
    subGain.gain.value = 0.4; // lower volume for the harmonic layer
    osc2.connect(subGain);
    subGain.connect(gain);
    osc2.start(startTime);
    osc2.stop(startTime + duration + 0.01);
  }
}

/**
 * Preview a chord progression through Web Audio.
 * @returns a stop function
 */
export function previewProgression(
  progression: ChordEntry[],
  tempo: number = 120,
): () => void {
  const ctx = getCtx();
  stopFlag = false;

  const beatDuration = 60 / tempo; // seconds per beat
  const barDuration = beatDuration * 4; // 4/4 time

  let time = ctx.currentTime + 0.05; // small offset

  for (const chord of progression) {
    if (stopFlag) break;
    const duration = (chord.bars || 2) * barDuration;
    const notes = chordToMidi(chord.root, chord.quality, 3); // octave 3 for warm sound
    playChord(ctx, notes, time, duration - 0.05);
    time += duration;
  }

  const stopFn = () => {
    stopFlag = true;
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
  };

  // Auto-stop after playback finishes
  const totalDuration = (time - ctx.currentTime) * 1000;
  const timeout = setTimeout(() => {
    // Don't close if user already stopped
  }, totalDuration + 100);

  return () => {
    clearTimeout(timeout);
    stopFn();
  };
}

// ── Scale/key utilities ──

const SCALE_INTERVALS: Record<string, number[]> = {
  major:            [0, 2, 4, 5, 7, 9, 11],
  natural_minor:    [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor:   [0, 2, 3, 5, 7, 8, 11],
  melodic_minor:    [0, 2, 3, 5, 7, 9, 11],
  dorian:           [0, 2, 3, 5, 7, 9, 10],
  mixolydian:       [0, 2, 4, 5, 7, 9, 10],
  lydian:           [0, 2, 4, 6, 7, 9, 11],
  phrygian:         [0, 1, 3, 5, 7, 8, 10],
  locrian:          [0, 1, 3, 5, 6, 8, 10],
  blues:            [0, 3, 5, 6, 7, 10],
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
};

const ALL_NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/**
 * Get the notes in a given key and scale.
 */
export function getScaleNotes(key: string, scale: string): string[] {
  const rootSemitone = NOTE_TO_SEMITONE[key] ?? 0;
  const intervals = SCALE_INTERVALS[scale] || SCALE_INTERVALS["major"];
  return intervals.map((i) => ALL_NOTES[(rootSemitone + i) % 12]);
}

/**
 * Get diatonic chord qualities for each scale degree.
 * Returns array of { root, quality } for the 7 scale degrees.
 */
export function getDiatonicChords(key: string, scale: string): { root: string; quality: string }[] {
  const intervals = SCALE_INTERVALS[scale] || SCALE_INTERVALS["major"];
  const rootSemitone = NOTE_TO_SEMITONE[key] ?? 0;

  return intervals.slice(0, 7).map((interval, i) => {
    const noteSemitone = (rootSemitone + interval) % 12;
    const root = ALL_NOTES[noteSemitone];

    // Determine quality by measuring 3rd and 5th intervals
    const thirdInterval = ((intervals[(i + 2) % intervals.length] - interval + 12) % 12);
    const fifthInterval = ((intervals[(i + 4) % intervals.length] - interval + 12) % 12);

    let quality = "maj";
    if (thirdInterval === 3 && fifthInterval === 7) quality = "min";
    else if (thirdInterval === 3 && fifthInterval === 6) quality = "dim";
    else if (thirdInterval === 4 && fifthInterval === 8) quality = "aug";
    else if (thirdInterval === 4 && fifthInterval === 7) quality = "maj";

    return { root, quality };
  });
}

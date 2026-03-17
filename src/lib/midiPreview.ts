/**
 * Role-aware MIDI preview engine using Web Audio API.
 *
 * Maps track roles to distinct timbres so candidates sound different
 * depending on whether they're bass, keys, lead, pad, etc.
 */

import type { CandidateNote } from "@/types";

// ── Audio context management ──

let audioCtx: AudioContext | null = null;
let activeStopFn: (() => void) | null = null;

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ── Instrument timbres by role ──

type RoleTimbre = "bass" | "keys" | "pad" | "lead" | "pluck" | "drums" | "default";

interface TimbreConfig {
  oscillators: Array<{ type: OscillatorType; detune: number; gain: number }>;
  attack: number;   // seconds
  release: number;  // fraction of duration (0-1)
  volume: number;   // base volume multiplier
  filterFreq?: number; // low-pass filter cutoff (Hz)
}

const TIMBRES: Record<RoleTimbre, TimbreConfig> = {
  bass: {
    oscillators: [
      { type: "triangle", detune: 0, gain: 1.0 },
      { type: "sine", detune: -1200, gain: 0.3 }, // sub octave
    ],
    attack: 0.01,
    release: 0.2,
    volume: 0.09,
    filterFreq: 400,
  },
  keys: {
    oscillators: [
      { type: "sine", detune: 0, gain: 0.7 },
      { type: "triangle", detune: 0, gain: 0.4 },
      { type: "sine", detune: 5, gain: 0.15 }, // slight chorus
    ],
    attack: 0.02,
    release: 0.25,
    volume: 0.05,
  },
  pad: {
    oscillators: [
      { type: "sine", detune: 0, gain: 0.5 },
      { type: "triangle", detune: 3, gain: 0.3 },
      { type: "sine", detune: -3, gain: 0.3 },
    ],
    attack: 0.15,
    release: 0.4,
    volume: 0.04,
  },
  lead: {
    oscillators: [
      { type: "sawtooth", detune: 0, gain: 0.4 },
      { type: "square", detune: 7, gain: 0.15 },
    ],
    attack: 0.01,
    release: 0.15,
    volume: 0.04,
    filterFreq: 3000,
  },
  pluck: {
    oscillators: [
      { type: "triangle", detune: 0, gain: 0.7 },
      { type: "square", detune: 0, gain: 0.1 },
    ],
    attack: 0.005,
    release: 0.5,
    volume: 0.05,
    filterFreq: 2500,
  },
  drums: {
    oscillators: [
      { type: "square", detune: 0, gain: 0.5 },
      { type: "triangle", detune: 0, gain: 0.5 },
    ],
    attack: 0.002,
    release: 0.6,
    volume: 0.06,
  },
  default: {
    oscillators: [
      { type: "sine", detune: 0, gain: 0.7 },
      { type: "triangle", detune: 0, gain: 0.3 },
    ],
    attack: 0.02,
    release: 0.25,
    volume: 0.05,
  },
};

function roleToTimbre(role: string | undefined): RoleTimbre {
  if (!role) return "default";
  const r = role.toLowerCase();
  if (r === "bass") return "bass";
  if (r === "keys" || r === "comping" || r === "piano") return "keys";
  if (r === "pad" || r === "strings") return "pad";
  if (r === "lead" || r === "melody") return "lead";
  if (r === "pluck" || r === "arp") return "pluck";
  if (r === "drums" || r === "percussion" || r === "rhythmic") return "drums";
  return "default";
}

// ── Playback engine ──

export interface PreviewHandle {
  /** Stop playback */
  stop: () => void;
  /** Current playback position in beats (for playhead). Returns -1 if stopped. */
  getPositionBeats: () => number;
  /** Whether playback is still active */
  isPlaying: () => boolean;
}

export function previewMidi(
  notes: CandidateNote[],
  opts: {
    tempo?: number;
    role?: string;
    onEnd?: () => void;
  } = {},
): PreviewHandle {
  // Stop any existing preview
  if (activeStopFn) activeStopFn();

  const ctx = getCtx();
  const tempo = opts.tempo || 120;
  const timbre = TIMBRES[roleToTimbre(opts.role)];
  const beatDur = 60 / tempo;
  const startWallTime = ctx.currentTime + 0.05;

  const allNodes: AudioNode[] = [];
  let stopped = false;

  for (const n of notes) {
    const noteStart = startWallTime + n.time * beatDur;
    const noteDur = n.duration * beatDur;
    const velGain = (n.velocity / 127);
    const vol = velGain * timbre.volume;

    const attack = timbre.attack;
    const release = Math.min(noteDur * timbre.release, noteDur * 0.4);

    // Envelope gain
    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0, noteStart);
    envGain.gain.linearRampToValueAtTime(vol, noteStart + attack);
    envGain.gain.setValueAtTime(vol, noteStart + noteDur - release);
    envGain.gain.linearRampToValueAtTime(0, noteStart + noteDur);

    // Optional low-pass filter
    let outputNode: AudioNode = envGain;
    if (timbre.filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = timbre.filterFreq;
      filter.Q.value = 1;
      envGain.connect(filter);
      filter.connect(ctx.destination);
      outputNode = filter;
      allNodes.push(filter);
    } else {
      envGain.connect(ctx.destination);
    }
    allNodes.push(envGain);

    // Oscillators
    for (const oscConfig of timbre.oscillators) {
      const osc = ctx.createOscillator();
      osc.type = oscConfig.type;
      osc.frequency.value = midiToFreq(n.pitch);
      osc.detune.value = oscConfig.detune;

      const oscGain = ctx.createGain();
      oscGain.gain.value = oscConfig.gain;
      osc.connect(oscGain);
      oscGain.connect(envGain);

      osc.start(noteStart);
      osc.stop(noteStart + noteDur + 0.02);
      allNodes.push(osc, oscGain);
    }
  }

  // Calculate total duration
  const maxEnd = notes.reduce(
    (m, n) => Math.max(m, (n.time + n.duration) * beatDur),
    0,
  );
  const totalDurMs = (maxEnd + 0.3) * 1000;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    // Disconnect all nodes
    for (const node of allNodes) {
      try {
        if (node instanceof OscillatorNode) node.stop();
        node.disconnect();
      } catch { /* already stopped/disconnected */ }
    }
    allNodes.length = 0;
    if (activeStopFn === stop) activeStopFn = null;
    opts.onEnd?.();
  };

  activeStopFn = stop;

  // Auto-stop after playback completes
  const timer = setTimeout(stop, totalDurMs);

  const handle: PreviewHandle = {
    stop: () => {
      clearTimeout(timer);
      stop();
    },
    getPositionBeats: () => {
      if (stopped) return -1;
      const elapsed = ctx.currentTime - startWallTime;
      if (elapsed < 0) return 0;
      const beats = elapsed / beatDur;
      return beats;
    },
    isPlaying: () => !stopped,
  };

  return handle;
}

/**
 * Stop any currently playing preview.
 */
export function stopPreview(): void {
  if (activeStopFn) activeStopFn();
}

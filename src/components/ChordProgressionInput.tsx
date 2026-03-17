import { Plus, X, RefreshCw, Loader2 } from "lucide-react";
import type { ChordEntry } from "@/types";
import { FLAT_NOTE_NAMES, CHORD_QUALITIES } from "@/types";
import { getScaleNotes, getDiatonicChords } from "@/lib/chordPreview";
import { useMemo, useState } from "react";

interface ChordProgressionInputProps {
  value: ChordEntry[];
  onChange: (progression: ChordEntry[]) => void;
  songKey?: string | null;
  songScale?: string | null;
  /** When set, enables per-chord AI regeneration */
  onRegenerateChord?: (index: number) => Promise<void>;
}

export function ChordProgressionInput({ value, onChange, songKey, songScale, onRegenerateChord }: ChordProgressionInputProps) {
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Compute diatonic notes and chords when key/scale are set
  const scaleNotes = useMemo(() => {
    if (!songKey || !songScale) return null;
    return getScaleNotes(songKey, songScale);
  }, [songKey, songScale]);

  const diatonicChords = useMemo(() => {
    if (!songKey || !songScale) return null;
    return getDiatonicChords(songKey, songScale);
  }, [songKey, songScale]);

  // Get suggested qualities for a given root note
  const getQualitiesForRoot = (root: string): string[] => {
    if (!diatonicChords) return [...CHORD_QUALITIES];
    const match = diatonicChords.find((c) => c.root === root);
    if (!match) return [...CHORD_QUALITIES];
    const diatonic = match.quality;
    return [diatonic, ...CHORD_QUALITIES.filter((q) => q !== diatonic)];
  };

  const rootNotes = scaleNotes
    ? [...scaleNotes, ...FLAT_NOTE_NAMES.filter((n) => !scaleNotes.includes(n))]
    : [...FLAT_NOTE_NAMES];

  const addChord = () => {
    const defaultRoot = scaleNotes?.[0] || "C";
    const defaultQuality = diatonicChords?.[0]?.quality || "maj";
    onChange([...value, { root: defaultRoot, quality: defaultQuality, bars: 2 }]);
  };

  const removeChord = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateChord = (index: number, updates: Partial<ChordEntry>) => {
    onChange(value.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  const handleRegenerateChord = async (index: number) => {
    if (!onRegenerateChord || regeneratingIndex !== null) return;
    setRegeneratingIndex(index);
    try {
      await onRegenerateChord(index);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  return (
    <div className="space-y-1.5">
      {value.map((chord, i) => {
        const qualities = getQualitiesForRoot(chord.root);
        const isDiatonic = scaleNotes?.includes(chord.root);
        const isRegenerating = regeneratingIndex === i;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <select
              value={chord.root}
              onChange={(e) => {
                const newRoot = e.target.value;
                const match = diatonicChords?.find((c) => c.root === newRoot);
                const updates: Partial<ChordEntry> = { root: newRoot };
                if (match) updates.quality = match.quality;
                updateChord(i, updates);
              }}
              className="bg-input border border-border rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-14"
            >
              {rootNotes.map((n) => {
                const inScale = scaleNotes?.includes(n);
                return (
                  <option key={n} value={n}>
                    {n}{scaleNotes && !inScale ? " *" : ""}
                  </option>
                );
              })}
            </select>

            <select
              value={chord.quality}
              onChange={(e) => updateChord(i, { quality: e.target.value })}
              className="bg-input border border-border rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-16"
            >
              {qualities.map((q, qi) => (
                <option key={q} value={q}>
                  {q}{scaleNotes && qi === 0 && isDiatonic ? " \u2713" : ""}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={16}
              value={chord.bars}
              onChange={(e) => updateChord(i, { bars: Number(e.target.value) })}
              className="w-12 bg-input border border-border rounded px-1.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-[10px] text-muted-foreground">bars</span>

            {onRegenerateChord && (
              <button
                onClick={() => handleRegenerateChord(i)}
                disabled={isRegenerating || regeneratingIndex !== null}
                className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-40 transition-colors"
                title="Regenerate this chord"
              >
                {isRegenerating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
              </button>
            )}

            <button
              onClick={() => removeChord(i)}
              className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}

      <button
        onClick={addChord}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <Plus size={12} />
        Add chord
      </button>
    </div>
  );
}

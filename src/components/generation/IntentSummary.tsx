/**
 * IntentSummary — structured generation intent summary.
 *
 * Shows the generation intent as a clear hierarchy:
 *   Role → Section → Destination (target)
 *   Style source and value (context)
 *   User-set refinements (overrides) — role-appropriate labels
 *   Advanced settings (when set)
 *   Contextual subtitle explaining the configuration
 */

import { STYLE_WORLD_LABELS } from "@/types";
import type { OutputTarget } from "./GenerationControls";
import type { SongSection } from "@/types";
import type { StyleSourceMode } from "./StyleSourceSelector";
import { getRoleFamily } from "./refinementSchemas";

interface IntentSummaryProps {
  role: string;
  section: SongSection | null;
  destination: OutputTarget;
  styleSourceMode: StyleSourceMode;
  effectiveStyle: string | null;
  // Shared
  groove: string;
  feel: string;
  density: string;
  energy: string;
  // Melodic
  motion: string;
  voicing: string;
  phraseBehavior: string;
  articulation: string;
  brightness: string;
  harmonicTension: string;
  // Drums
  pulse: string;
  kickBehavior: string;
  backbeat: string;
  hatCymbal: string;
  phraseEvolution: string;
  ornamentation: string;
  kitCharacter: string;
  // Shared advanced
  humanize: string;
}

function formatValue(v: string): string {
  return v.replace(/[-_]/g, " ");
}

export function IntentSummary({
  role,
  section,
  destination,
  styleSourceMode,
  effectiveStyle,
  groove,
  feel,
  density,
  energy,
  motion,
  voicing,
  phraseBehavior,
  articulation,
  brightness,
  harmonicTension,
  pulse,
  kickBehavior,
  backbeat,
  hatCymbal,
  phraseEvolution,
  ornamentation,
  kitCharacter,
  humanize,
}: IntentSummaryProps) {
  const hasRole = !!role;
  const hasStyle = !!effectiveStyle;
  const family = getRoleFamily(role);

  // Build refinement tags based on role family
  const refinements: string[] = [];

  // Shared
  if (groove) refinements.push(`Groove ${groove}`);
  if (feel) refinements.push(`Feel ${feel}`);
  if (density) refinements.push(`Density ${density}`);
  if (energy) refinements.push(`Energy ${energy}`);

  if (family === "drums") {
    if (pulse) refinements.push(`Pulse ${formatValue(pulse)}`);
    if (kickBehavior) refinements.push(`Kick ${kickBehavior}`);
    if (backbeat) refinements.push(`Backbeat ${backbeat}`);
    if (hatCymbal) refinements.push(`Hats ${formatValue(hatCymbal)}`);
  } else {
    if (motion) refinements.push(`Motion ${motion}`);
    if (voicing) refinements.push(`Voicing ${voicing}`);
    if (phraseBehavior) refinements.push(`Phrase ${formatValue(phraseBehavior)}`);
  }

  const advanced: string[] = [];

  if (family === "drums") {
    if (phraseEvolution) advanced.push(`Evolution ${formatValue(phraseEvolution)}`);
    if (ornamentation) advanced.push(`Detail ${formatValue(ornamentation)}`);
    if (kitCharacter) advanced.push(`Kit ${kitCharacter}`);
  } else {
    if (articulation) advanced.push(`Articulation ${articulation}`);
    if (brightness) advanced.push(`Brightness ${brightness}`);
    if (harmonicTension) advanced.push(`Tension ${harmonicTension}`);
  }

  if (humanize && humanize !== "none") advanced.push(`Humanize ${humanize}`);

  const hasOverrides = refinements.length > 0 || advanced.length > 0;

  if (!hasRole && !hasStyle && !hasOverrides) return null;

  const destLabel = destination === "new_track" ? "New Track" : destination.trackName;

  const sourceLabel =
    styleSourceMode === "song" ? "Song Style" :
    styleSourceMode === "section" ? "Section Style" :
    "Custom";

  const styleLabel = effectiveStyle
    ? STYLE_WORLD_LABELS[effectiveStyle] || effectiveStyle
    : null;

  // Build contextual subtitle
  let subtitle = "";
  if (hasStyle) {
    subtitle = `Using ${sourceLabel.toLowerCase()}`;
    if (hasOverrides) subtitle += " with custom refinements.";
    else subtitle += ".";
  } else if (hasOverrides) {
    subtitle = "Custom refinements, no style context set.";
  }

  return (
    <div className="rounded bg-muted/40 border border-border/60 px-3 py-2 space-y-1">
      <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider block">
        Generation Intent
      </span>

      {/* Target line: Role → Section → Destination */}
      {(hasRole || section) && (
        <div className="text-[10px] leading-relaxed">
          <span className="text-muted-foreground">Role: </span>
          <span className="font-medium text-foreground">
            {role ? role.charAt(0).toUpperCase() + role.slice(1) : "—"}
          </span>
          {section && (
            <>
              <span className="text-muted-foreground/40 mx-1">&rarr;</span>
              <span className="font-medium text-foreground">{section.name}</span>
              <span className="text-muted-foreground"> / {section.length_bars} bars</span>
            </>
          )}
          <span className="text-muted-foreground/40 mx-1">&rarr;</span>
          <span className="text-foreground">{destLabel}</span>
        </div>
      )}

      {/* Style context line */}
      {hasStyle && (
        <div className="text-[10px] leading-relaxed">
          <span className="text-muted-foreground">Context: </span>
          <span className="font-medium text-foreground">{sourceLabel}</span>
          <span className="text-muted-foreground/40 mx-1">&rarr;</span>
          <span className="font-medium text-primary/80">{styleLabel}</span>
        </div>
      )}

      {/* Refinements line */}
      {refinements.length > 0 && (
        <div className="text-[10px] leading-relaxed">
          <span className="text-muted-foreground">Overrides: </span>
          <span className="text-foreground">{refinements.join(", ")}</span>
        </div>
      )}

      {/* Advanced line */}
      {advanced.length > 0 && (
        <div className="text-[10px] leading-relaxed">
          <span className="text-muted-foreground">Advanced: </span>
          <span className="text-foreground">{advanced.join(", ")}</span>
        </div>
      )}

      {/* Contextual subtitle */}
      {subtitle && (
        <p className="text-[9px] text-muted-foreground/50 italic mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
  );
}

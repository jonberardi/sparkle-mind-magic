import { Info } from "lucide-react";

export function StyleDrivesInfo() {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-muted/40 border border-border/50">
      <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
      <div className="text-[11px] text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground/80">This style drives:</span>{" "}
        song defaults &middot; section interpretation &middot; clip/track generation &middot; candidate exploration
      </div>
    </div>
  );
}

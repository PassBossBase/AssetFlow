export type AmbientLightVariant = "marketing" | "auth" | "workspace";

type AmbientLightBackgroundProps = {
  variant: AmbientLightVariant;
};

export function AmbientLightBackground({ variant }: AmbientLightBackgroundProps) {
  return (
    <div className={`ambient-light ambient-light--${variant}`} aria-hidden="true">
      <span className="ambient-orb ambient-orb-primary" />
      <span className="ambient-orb ambient-orb-secondary" />
      <span className="ambient-orb ambient-orb-tertiary" />
    </div>
  );
}

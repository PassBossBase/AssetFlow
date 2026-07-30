import { AmbientLightBackground, type AmbientLightVariant } from "@/components/layout/ambient-light-background";

type AmbientPageProps = Readonly<{
  children: React.ReactNode;
  variant: AmbientLightVariant;
}>;

export function AmbientPage({ children, variant }: AmbientPageProps) {
  return (
    <div className="relative isolate min-h-[100dvh] overflow-x-clip bg-background text-foreground">
      <AmbientLightBackground variant={variant} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

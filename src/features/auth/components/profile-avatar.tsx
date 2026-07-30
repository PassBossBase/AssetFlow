import { cn } from "@/lib/utils";

type ProfileAvatarProps = {
  className?: string;
  image?: string | null;
  name?: string | null;
};

export function ProfileAvatar({ className, image, name }: ProfileAvatarProps) {
  const initial = name?.trim().charAt(0).toUpperCase() || "A";

  if (image) {
    return (
      <span
        aria-label={name ?? "Profile avatar"}
        role="img"
        className={cn("block shrink-0 rounded-full border border-primary/35 bg-primary/10 bg-cover bg-center", className)}
        style={{ backgroundImage: `url("${image}")` }}
      />
    );
  }

  return <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/15 font-semibold text-primary", className)}>{initial}</span>;
}

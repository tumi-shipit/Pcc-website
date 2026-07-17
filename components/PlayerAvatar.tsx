type PlayerAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

type PlayerAvatarProps = {
  name: string;
  photoUrl?: string | null;
  size?: PlayerAvatarSize;
  className?: string;
  priority?: boolean;
};

const sizeClasses: Record<PlayerAvatarSize, string> = {
  xs: "h-8 w-8 text-[10px]",
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-base",
  lg: "h-20 w-20 text-xl",
  xl: "h-32 w-32 text-3xl",
};

export function playerInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function PlayerAvatar({
  name,
  photoUrl,
  size = "md",
  className = "",
  priority: _priority = false,
}: PlayerAvatarProps) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-red-600/10 font-black text-red-200 ${sizeClasses[size]} ${className}`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading={_priority ? "eager" : "lazy"}
        />
      ) : (
        playerInitials(name)
      )}
    </div>
  );
}

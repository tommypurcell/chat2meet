import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";

type UserAvatarProps = {
  name: string;
  photoURL?: string | null;
  size?: number;
  className?: string;
};

export function UserAvatar({ name, photoURL, size = 32, className }: UserAvatarProps) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return <Avatar name={name || "?"} size={size} className={className} />;
}

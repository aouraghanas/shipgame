import Image from "next/image";
import { getInitials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: { px: 32, cls: "h-8 w-8 text-xs" },
  md: { px: 40, cls: "h-10 w-10 text-sm" },
  lg: { px: 56, cls: "h-14 w-14 text-base" },
  xl: { px: 80, cls: "h-20 w-20 text-xl" },
};

export function Avatar({ name, avatarUrl, size = "md" }: AvatarProps) {
  const { px, cls } = sizeMap[size];

  if (avatarUrl) {
    return (
      <div className={`${cls} relative rounded-full overflow-hidden flex-shrink-0`}>
        <Image
          src={avatarUrl}
          alt={name}
          width={px}
          height={px}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-bold flex-shrink-0 bg-indigo-600 text-white`}
    >
      {getInitials(name)}
    </div>
  );
}

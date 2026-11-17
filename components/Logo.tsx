import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "h-8 w-8", size = 32 }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Alpha Kids Logo"
      width={size}
      height={size}
      className={`object-contain select-none transition-all dark:invert ${className}`}
      priority
    />
  );
}

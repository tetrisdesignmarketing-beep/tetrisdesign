import { cn } from "@/lib/utils";

interface AboutAwardsSectionProps {
  children: React.ReactNode;
  className?: string;
}

/** Giải thưởng — nằm trong morph pin `#about-hero`, không tách section riêng */
export function AboutAwardsSection({
  children,
  className,
}: AboutAwardsSectionProps) {
  return (
    <div
      data-about-awards=""
      data-about-grid-deep-zone=""
      className={cn(className)}
    >
      {children}
    </div>
  );
}

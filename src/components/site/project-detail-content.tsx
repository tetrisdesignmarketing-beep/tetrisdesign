import { cn } from "@/lib/utils";

interface ProjectDetailContentProps {
  concept?: string;
  address?: string;
  description: string;
  className?: string;
}

export function ProjectDetailContent({
  concept,
  address,
  description,
  className,
}: ProjectDetailContentProps) {
  const meta = [concept, address].filter(Boolean).join(" | ");

  return (
    <section
      className={cn(
        "mx-auto max-w-3xl px-4 py-[min(20vh,8rem)] text-center",
        className,
      )}
    >
      {meta ? (
        <p className="site-label-text uppercase tracking-[0.2em] text-muted-foreground">
          {meta}
        </p>
      ) : null}
      <p className="mt-6 text-base leading-relaxed text-foreground md:text-lg">
        {description}
      </p>
    </section>
  );
}

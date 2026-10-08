import Image from "next/image";
import type { SiteProject } from "@/lib/site-content";
import { cn } from "@/lib/utils";

interface ProjectDetailHeroProps {
  project: SiteProject;
  className?: string;
}

export function ProjectDetailHero({
  project,
  className,
}: ProjectDetailHeroProps) {
  const image = project.heroImage ?? project.illustration;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative aspect-[4/3] w-full bg-muted/30 md:aspect-[21/9]">
        <Image
          src={image}
          alt={project.title}
          fill
          priority
          unoptimized
          className={cn(
            "object-contain p-8 md:object-cover md:p-0 md:grayscale",
            !project.heroImage && "p-12 md:p-16",
          )}
          sizes="100vw"
        />
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-bold uppercase tracking-[var(--tracking-label)] md:text-2xl">
          {project.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {project.categoryLabel} | {project.location}
        </p>
      </div>
    </div>
  );
}

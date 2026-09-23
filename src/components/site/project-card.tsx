import Image from "next/image";
import { ProjectCardLink } from "@/components/site/project-card-link";
import { ProgressiveImage } from "@/components/site/progressive-image";
import type { SiteProject } from "@/lib/site-content";
import {
  HOME_CARD_FULL_WIDTH,
  HOME_CARD_PREVIEW_WIDTH,
} from "@/lib/optimized-image-src";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: SiteProject;
  className?: string;
  variant?: "default" | "home" | "gallery";
  /** Override cover (used by project detail gallery slides). */
  image?: string;
  /** Preview then full — does not delay the curtain cover. */
  progressive?: boolean;
}

export function ProjectCard({
  project,
  className,
  variant = "default",
  image,
  progressive = false,
}: ProjectCardProps) {
  const isHome = variant === "home";
  const isGallery = variant === "gallery";
  const centerCaption = !isGallery;
  const src = image ?? project.illustration;

  const media = (
    <div
      data-project-card-media=""
      className={cn(
        "relative w-full overflow-hidden bg-background",
        isHome ? "aspect-[4/5]" : "aspect-square",
      )}
    >
      {progressive ? (
        <ProgressiveImage
          src={src}
          alt={project.title}
          previewWidth={HOME_CARD_PREVIEW_WIDTH}
          fullWidth={HOME_CARD_FULL_WIDTH}
          className={cn(
            "object-contain object-center",
            isGallery && "transition-transform duration-300 group-hover:scale-[1.02]",
            isHome ? "p-4 md:p-6" : isGallery ? "p-4" : "p-7",
          )}
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      ) : (
        <Image
          src={src}
          alt={project.title}
          fill
          unoptimized
          className={cn(
            "object-contain object-center",
            isGallery && "transition-transform duration-300 group-hover:scale-[1.02]",
            isHome ? "p-4 md:p-6" : isGallery ? "p-4" : "p-7",
          )}
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      )}
    </div>
  );

  const meta = centerCaption ? (
    <>
      <h3 className="mt-2.5 w-full text-center site-label-text font-[family-name:var(--font-ui)] uppercase leading-tight tracking-[0.06em] text-foreground md:mt-3">
        {project.title}
      </h3>
      <p className="mt-1 w-full text-center text-[11px] leading-snug text-foreground md:text-xs">
        {project.categoryLabel} | {project.location}
      </p>
    </>
  ) : null;

  return (
    <article className={cn("group", centerCaption && "text-center", className)}>
      {isGallery ? (
        media
      ) : (
        <ProjectCardLink
          href={`/projects/${project.slug}`}
          triggerLoading={!isHome}
        >
          {media}
          {meta}
        </ProjectCardLink>
      )}
    </article>
  );
}

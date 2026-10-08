import Link from "next/link";
import { SiteImage } from "@/components/site/site-image";
import { cn } from "@/lib/utils";

interface ProjectDetailCoverProps {
  title: string;
  src: string;
  concept: string;
  address: string;
  className?: string;
}

export function ProjectDetailCover({
  title,
  src,
  concept,
  address,
  className,
}: ProjectDetailCoverProps) {
  return (
    <section
      className={cn("project-detail-cover", className)}
      aria-labelledby="project-detail-title"
    >
      <SiteImage
        src={src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="project-detail-cover__scrim" aria-hidden />
      <Link
        href="/projects"
        className="absolute left-4 top-4 z-10 text-xs font-medium uppercase tracking-[var(--tracking-label)] text-white/70 transition-colors hover:text-white"
      >
        ← Dự án
      </Link>
      <div className="project-detail-cover__copy">
        <h1 id="project-detail-title" className="project-detail-cover__title">
          {title}
        </h1>
        <p className="project-detail-cover__meta">
          {concept} | {address}
        </p>
      </div>
    </section>
  );
}

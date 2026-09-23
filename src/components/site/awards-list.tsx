import type { AwardGroup } from "@/lib/site-content";
import { cn } from "@/lib/utils";

interface AwardsListProps {
  title: string;
  groups: readonly AwardGroup[];
  className?: string;
}

export function AwardsList({ title, groups, className }: AwardsListProps) {
  return (
    <section className={cn("py-12", className)}>
      <h2
        data-section-title=""
        className="site-label-text uppercase"
      >
        <span data-scroll-blur="">{title}</span>
      </h2>
      <div data-section-body="" data-ml11-body="" className="mt-3 space-y-8">
        {groups.map((group) => (
          <div key={group.title} data-scroll-blur="">
            <h3 className="text-sm font-normal">{group.title}</h3>
            <ul className="mt-2 list-disc space-y-2 pl-[32px]">
              {group.items.map((item) => (
                <li
                  key={`${item.year}-${item.title}`}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="text-foreground">{item.year}</span>
                  {" — "}
                  {item.title}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

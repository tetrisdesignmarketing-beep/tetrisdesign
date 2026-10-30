import type {
  AboutContentBlock,
  AboutPageBlock,
} from "@/lib/validations/site-page";

/* Kept out of validations/site-page.ts so client components don't pull zod. */

/** Tách danh sách theo vạch Brand break: trước = trong hero, sau = dưới brand break. */
export function splitAboutBlocks(blocks: readonly AboutPageBlock[]) {
  const index = blocks.findIndex((block) => block.type === "brandBreak");
  const isContent = (block: AboutPageBlock): block is AboutContentBlock =>
    block.type !== "brandBreak";
  if (index < 0) return { top: blocks.filter(isContent), bottom: [] };
  return {
    top: blocks.slice(0, index).filter(isContent),
    bottom: blocks.slice(index + 1).filter(isContent),
  };
}

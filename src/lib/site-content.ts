/**
 * Nội dung site TETRIS DESIGN — hardcode, dev sửa file khi cần.
 * @see docs/architecture/DECISIONS.md
 */

import { pickBalancedLatest } from "@/lib/pick-balanced-latest";

export const siteBrand = {
  name: "TETRIS DESIGN",
  domain: "tetrisdesign.vn",
  copyright: "© 2026 TETRIS DESIGN",
  colors: {
    black: "#231f20",
    white: "#ffffff",
    red: "#7a1f27",
  },
  fonts: {
    logoDefaultFont: "Fashion Didot W90 Regular",
    ui: "Gilroy",
  },
} as const;

export const siteNav = [
  { label: "TRANG CHỦ", href: "/" },
  { label: "GIỚI THIỆU", href: "/about" },
  { label: "DỰ ÁN", href: "/projects" },
  { label: "DỊCH VỤ", href: "/services" },
  { label: "LIÊN HỆ", href: "/contact" },
] as const;
/** Login admin: không còn ở menu — bấm "© 2026 TETRIS DESIGN" ở footer để vào. */
export const siteAdminLoginHref = "/admin/login";

export const siteContact = {
  email: "tetrisdesign.mng@gmail.com",
  phone: "+84 969 873 396",
  address: "Số 31 Ngõ 135 Đội Cấn, Ba Đình, Hanoi, Vietnam",
  mapsQuery: "31/135 Đội Cấn, Ba Đình, Hanoi, Vietnam",
  /** Trung tâm map — single source of truth (OSM marker / Maps JS) */
  mapsCenter: { lat: 21.0352, lng: 105.8228 } as const,
  mapsUrl:
    "https://maps.google.com/?q=31%2F135+%C4%90%E1%BB%99i+C%E1%BA%A5n,+Ba+%C4%90%C3%ACnh,+Hanoi,+Vietnam",
  /** OpenStreetMap embed — fallback khi chưa có NEXT_PUBLIC_GOOGLE_MAPS_API_KEY */
  osmEmbedUrl:
    "https://www.openstreetmap.org/export/embed.html?bbox=105.8195%2C21.0320%2C105.8265%2C21.0385&layer=mapnik&marker=21.0352%2C105.8228",
} as const;

export const siteSocial = {
  facebook: "https://www.facebook.com/Tetrisvietnam",
  instagram: "https://www.instagram.com/tetris.interior/",
  tiktok: "https://www.tiktok.com/@tetrisdesignn",
  behance: process.env.NEXT_PUBLIC_BEHANCE_URL ?? null,
} as const;

export interface AwardGroup {
  title: string;
  items: { year: number; title: string }[];
}

export const siteAbout = {
  heroImage: "/site/about/about1.png",
  brandBreakImage: "/site/about/about2.png",
  introduction: {
    title: "GIỚI THIỆU",
    paragraphs: [
      "Tetris Design là công ty chuyên thiết kế và thi công nội thất các không gian thương mại như nhà hàng, showroom, bán lẻ, khách sạn và spa. Đội ngũ kiến trúc sư và designer giàu kinh nghiệm của chúng tôi luôn đặt con người làm trung tâm, hướng tới các giải pháp bền vững và có tính ứng dụng cao.",
    ],
  },
  awards: {
    title: "GIẢI THƯỞNG",
    groups: [
      {
        title: "Kiến trúc sư Đặng Hữu Trọng",
        items: [
          { year: 2018, title: "Giải thưởng AYDA Vietnam" },
          { year: 2019, title: "Asia Young Designer of the Year" },
          { year: 2019, title: "Học bổng Harvard GSD" },
        ],
      },
      {
        title: "Tetris Design",
        items: [
          {
            year: 2026,
            title: "Best F&B Interior Design in Asia — Genji Steak",
          },
          {
            year: 2026,
            title: "VMARK Vietnam Design Award (Silver) — Flush Coffee",
          },
        ],
      },
    ] satisfies AwardGroup[],
  },
  journey: {
    title: "HÀNH TRÌNH",
    paragraphs: [
      "Thành lập năm 2018, Tetris Design là công ty năng động chuyên thiết kế kiến trúc và nội thất. Sứ mệnh của chúng tôi là biến mỗi không gian thành một tác phẩm vừa đẹp vừa có tính ứng dụng cao.",
      "Chúng tôi kết hợp chuyên môn kỹ thuật với tư duy thẩm mỹ, lắng nghe nhu cầu từng khách hàng để kiến tạo môi trường sống và làm việc truyền cảm hứng — cân bằng giữa hình thức và trải nghiệm sử dụng thực tế.",
    ],
  },
  partners: {
    title: "ĐỐI TÁC",
    items: [
      { name: "H'nee house", logo: "/site/partners/hnee-house.png" },
      { name: "Amway", logo: "/site/partners/amway.png" },
      { name: "SIXDO", logo: "/site/partners/sixdo.png" },
    ],
  },
} as const;

export interface SiteService {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}

export const siteServices: SiteService[] = [
  {
    title: "THIẾT KẾ NHẬN DIỆN THƯƠNG HIỆU",
    description:
      "Tetris đồng hành cùng khách hàng trong việc định hình ngôn ngữ thị giác và định hướng thương hiệu, từ đó xây dựng một hệ thống nhận diện rõ ràng, nhất quán và mang tính ứng dụng cao trong thực tế.",
    image: "/site/services/service1.png",
    imageAlt: "Thiết kế nhận diện thương hiệu",
  },
  {
    title: "THIẾT KẾ KIẾN TRÚC & NỘI THẤT",
    description:
      "Nơi câu chuyện thương hiệu được chuyển hóa thành ngôn ngữ không gian. Mỗi đường nét, vật liệu và bố cục đều được tính toán nhằm kiến tạo một không gian vừa giàu giá trị thẩm mỹ, vừa đáp ứng hành vi người dùng và mục tiêu kinh doanh.",
    image: "/site/services/service2.png",
    imageAlt: "Thiết kế kiến trúc và nội thất",
  },
  {
    title: "THI CÔNG",
    description:
      "Trong suốt quá trình triển khai, Tetris kiểm soát chặt chẽ từng giai đoạn để đảm bảo thiết kế được hiện thực hóa một cách chính xác, nhất quán và hiệu quả.",
    image: "/site/services/service3.png",
    imageAlt: "Thi công",
  },
];

export type ProjectCategory = "accommodation" | "fnb" | "showroom";

export interface HeroSlide {
  image: string;
  title: string;
  location: string;
  href: string;
  /** MOBILE | DESKTOP — thiếu (legacy) coi như dùng chung. */
  screenType?: "MOBILE" | "DESKTOP";
}

/** Public project — map Prisma `Post` (coverImage, images, concept, address). */
export type SiteProjectLayoutStyle =
  | "LAYOUTDEFAULT"
  | "LAYOUT1"
  | "LAYOUT2";

export interface SiteProject {
  slug: string;
  title: string;
  category: ProjectCategory;
  /** Map `Post.concept` */
  categoryLabel: string;
  /** Map `Post.address` */
  location: string;
  /** Card / list cover — map `Post.coverImage` khi chưa có heroImage */
  illustration: string;
  /** Ảnh bìa trang detail — map `Post.coverImage` */
  heroImage?: string;
  description?: string;
  /** Gallery trang detail — map `Post.images` */
  images?: string[];
  /** @deprecated — dùng `images` */
  gallery?: string[];
  /** Gallery layout — map `Post.layoutStyle`; thiếu → LAYOUT1 */
  layoutStyle?: SiteProjectLayoutStyle;
}

const COCKTAIL_PAIRING_DIR = "/site/projects/cocktail-pairing";
const COCKTAIL_PAIRING_FILES = [
  "B01.jpg",
  "B02.jpg",
  "B03.jpg",
  "B04.jpg",
  "B05.jpg",
  "F01.jpg",
  "F02.jpg",
  "F03.jpg",
  "F04.jpg",
  "H01.jpg",
  "H02.jpg",
  "H03.jpg",
  "H04.jpg",
  "H05.jpg",
  "R01.jpg",
  "R02.jpg",
  "R03.jpg",
  "R04.jpg",
  "R05.jpg",
  "R06.jpg",
  "R07.jpg",
  "R08.jpg",
  "S01.jpg",
  "S02.jpg",
  "S03.jpg",
  "S04.jpg",
  "V01.jpg",
  "V02.jpg",
  "V03.jpg",
  "V04.jpg",
  "V05.jpg",
  "V06.jpg",
  "V07.jpg",
  "V08.jpg",
  "V09.jpg",
  "V10.jpg",
] as const;

const cocktailPairingCover = `${COCKTAIL_PAIRING_DIR}/H01.jpg`;
const cocktailPairingImages = COCKTAIL_PAIRING_FILES.filter(
  (file) => file !== "H01.jpg",
).map((file) => `${COCKTAIL_PAIRING_DIR}/${file}`);

export function getProjectCover(project: SiteProject): string {
  return project.heroImage ?? project.illustration;
}

export function getProjectImages(project: SiteProject): string[] {
  return project.images ?? project.gallery ?? [];
}

export const projectCategories = [
  { id: "accommodation" as const, label: "LƯU TRÚ" },
  { id: "fnb" as const, label: "FNB" },
  { id: "showroom" as const, label: "SHOWROOM" },
] as const;

export const siteHeroSlides: HeroSlide[] = [
  {
    image: "/site/hero/sliderHome1.jpg",
    title: "D.CHIC SHOWROOM",
    location: "TRÀNG TIỀN, HÀ NỘI",
    href: "/projects/d-chic",
    screenType: "MOBILE",
  },
  {
    image: "/site/hero/sliderHome1.jpg",
    title: "D.CHIC SHOWROOM",
    location: "TRÀNG TIỀN, HÀ NỘI",
    href: "/projects/d-chic",
    screenType: "DESKTOP",
  },
  {
    image: "/site/hero/sliderHome2.jpg",
    title: "TETRIS DESIGN",
    location: "HÀ NỘI",
    href: "/projects",
    screenType: "MOBILE",
  },
  {
    image: "/site/hero/sliderHome2.jpg",
    title: "TETRIS DESIGN",
    location: "HÀ NỘI",
    href: "/projects",
    screenType: "DESKTOP",
  },
  {
    image: "/site/hero/sliderHome3.jpg",
    title: "SKY GEM",
    location: "HÀ NỘI",
    href: "/projects",
    screenType: "MOBILE",
  },
  {
    image: "/site/hero/sliderHome3.jpg",
    title: "SKY GEM",
    location: "HÀ NỘI",
    href: "/projects",
    screenType: "DESKTOP",
  },
  {
    image: "/site/hero/sliderHome4.jpg",
    title: "TETRIS DESIGN",
    location: "HÀ NỘI",
    href: "/projects",
    screenType: "MOBILE",
  },
  {
    image: "/site/hero/sliderHome4.jpg",
    title: "TETRIS DESIGN",
    location: "HÀ NỘI",
    href: "/projects",
    screenType: "DESKTOP",
  },
  {
    image: "/site/hero/sliderHome5.jpg",
    title: "TETRIS DESIGN",
    location: "HÀ NỘI",
    href: "/projects",
    screenType: "MOBILE",
  },
  {
    image: "/site/hero/sliderHome5.jpg",
    title: "TETRIS DESIGN",
    location: "HÀ NỘI",
    href: "/projects",
    screenType: "DESKTOP",
  },
];

export const siteProjects: SiteProject[] = [
  {
    slug: "quan-tien",
    title: "QUÁN TIÊN",
    category: "fnb",
    categoryLabel: "Nhà hàng",
    location: "Hà Nội",
    illustration: "/site/projects/projectCovers/quan-tien.png",
    description:
      "Không gian F&B với ngôn ngữ thiết kế tối giản, nhấn mạnh trải nghiệm ẩm thực và sự kết nối giữa khách hàng với thương hiệu.",
    gallery: ["/site/projects/projectCovers/quan-tien.png"],
  },
  {
    slug: "siam-siam",
    title: "SIAM SIAM",
    category: "fnb",
    categoryLabel: "Nhà hàng",
    location: "Hà Nội",
    illustration: "/site/projects/projectCovers/siam-siam.png",
    description:
      "Thiết kế nội thất lấy cảm hứng từ văn hóa Đông Nam Á, kết hợp vật liệu tự nhiên và ánh sáng ấm tạo không gian thưởng thức đặc trưng.",
    gallery: ["/site/projects/projectCovers/siam-siam.png"],
  },
  {
    slug: "nhan-sushi",
    title: "NHÂN SUSHI",
    category: "fnb",
    categoryLabel: "Nhà hàng",
    location: "Hà Nội",
    illustration: "/site/projects/projectCovers/nhan-sushi.png",
    description:
      "Showcase ẩm thực Nhật hiện đại với điểm nhấn điêu khắc nghệ thuật và bố cục không gian mở, tinh tế.",
    gallery: ["/site/projects/projectCovers/nhan-sushi.png"],
  },
  {
    slug: "the-vault",
    title: "THE VAULT",
    category: "fnb",
    categoryLabel: "Nhà hàng",
    location: "Hà Nội",
    illustration: "/site/projects/projectCovers/the-vault.png",
    description:
      "Concept bar với hệ thống ánh sáng điểm nhấn, tạo chiều sâu không gian và trải nghiệm thị giác mạnh mẽ.",
    gallery: ["/site/projects/projectCovers/the-vault.png"],
  },
  {
    slug: "d-chic",
    title: "D.CHIC",
    category: "showroom",
    categoryLabel: "Showroom",
    location: "Hà Nội",
    illustration: "/site/projects/projectCovers/d-chic-giang-vo.png",
    description:
      "Showroom thời trang với đường cong mềm mại, vật liệu cao cấp và lối dẫn trải nghiệm sản phẩm rõ ràng.",
    gallery: [
      "/site/projects/projectCovers/d-chic-giang-vo.png",
      "/site/projects/projectCovers/d-chic-ba-trieu.png",
    ],
  },
  {
    slug: "oasis-bar",
    title: "OASIS BAR",
    category: "fnb",
    categoryLabel: "Bar",
    location: "Hạ Long",
    illustration: "/site/projects/projectCovers/oasis-bar.png",
    description:
      "Không gian bar đối xứng với trần trang trí đặc trưng, kết hợp ánh sáng và vật liệu tạo điểm nhấn thị giác.",
    gallery: ["/site/projects/projectCovers/oasis-bar.png"],
  },
  {
    slug: "cocktail-pairing",
    title: "35 COCKTAILS & PAIRING",
    category: "fnb",
    categoryLabel: "Bar",
    location: "Hà Nội",
    illustration: cocktailPairingCover,
    heroImage: cocktailPairingCover,
    description:
      "Lounge bar 35 Cocktails & Pairing — không gian tối, đá thô và gỗ ấm, ánh sáng amber/đỏ. Bar tròn trung tâm, vách đá, vách gỗ treo và khu seating riêng cho pairing.",
    images: cocktailPairingImages,
  },
  {
    slug: "8-hours",
    title: "8 HOURS",
    category: "fnb",
    categoryLabel: "Cafe",
    location: "Hà Nội",
    illustration: "/site/projects/projectCovers/8-hours.png",
    description:
      "Cafe với cổng vòm và điểm nhấn điêu khắc đỏ, không gian thoáng đãng phù hợp trải nghiệm cà phê specialty.",
    gallery: [
      "/site/projects/projectCovers/8-hours.png",
      "/site/projects/projectCovers/8-hours-cg.png",
    ],
  },
  {
    slug: "lit-restobar",
    title: "LIT RESTOBAR",
    category: "accommodation",
    categoryLabel: "Lưu trú",
    location: "Hà Nội",
    illustration: "/site/projects/lit-restobar.svg",
    description:
      "Không gian lưu trú kết hợp F&B với thiết kế hiện đại, tối ưu trải nghiệm khách lưu trú dài ngày.",
    gallery: ["/site/projects/lit-restobar.svg"],
  },
];

export function parseProjectCategory(
  value?: string,
): ProjectCategory | null {
  if (
    value === "accommodation" ||
    value === "fnb" ||
    value === "showroom"
  ) {
    return value;
  }
  return null;
}

export function getProjectBySlug(slug: string): SiteProject | undefined {
  return siteProjects.find((p) => p.slug === slug);
}

export function getProjectsByCategory(
  category: ProjectCategory | null,
): SiteProject[] {
  if (!category) return siteProjects;
  return siteProjects.filter((p) => p.category === category);
}

export function getHomeProjects(limit = 8): SiteProject[] {
  return pickBalancedLatest(
    siteProjects,
    limit,
    (project) => project.category,
    projectCategories.map((category) => category.id),
  );
}

/** Ảnh bìa các dự án khác — section related trang detail. */
export function getRelatedProjects(
  slug: string,
  limit?: number,
): SiteProject[] {
  const current = getProjectBySlug(slug);
  const others = siteProjects.filter((project) => project.slug !== slug);
  const sameCategory = current
    ? others.filter((project) => project.category === current.category)
    : others;
  const rest = current
    ? others.filter((project) => project.category !== current.category)
    : [];
  const ordered = [...sameCategory, ...rest];
  return typeof limit === "number" ? ordered.slice(0, limit) : ordered;
}

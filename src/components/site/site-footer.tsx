import Link from "next/link";
import { Mail } from "lucide-react";
import { FaBehance, FaFacebookF, FaPhone, FaTiktok } from "react-icons/fa6";
import { RiInstagramLine } from "react-icons/ri";
import { SiZalo } from "react-icons/si";
import type { ReactNode } from "react";
import { siteAdminLoginHref, siteBrand } from "@/lib/site-content";
import {
  resolveSocialLinks,
  SOCIAL_KEYS,
  SOCIAL_LABELS,
  type SocialKey,
} from "@/lib/social-links";
import { getSitePageFallback } from "@/lib/site-page-defaults";
import type { ContactPageContent } from "@/lib/validations/site-page";
import { cn } from "@/lib/utils";

interface SiteFooterProps {
  className?: string;
  /** CMS contact; thiếu → fallback `siteContact` */
  contact?: ContactPageContent;
}

const iconClass = "h-4 w-4";

const SOCIAL_ICONS: Record<SocialKey, ReactNode> = {
  facebook: <FaFacebookF className={iconClass} aria-hidden />,
  instagram: <RiInstagramLine className={iconClass} aria-hidden />,
  tiktok: <FaTiktok className={iconClass} aria-hidden />,
  behance: <FaBehance className={iconClass} aria-hidden />,
  /* Logo Zalo có chữ bên trong → nhỉnh hơn chút cho dễ nhận. */
  zalo: <SiZalo className="h-5 w-5" aria-hidden />,
};

export function SiteFooter({ className, contact }: SiteFooterProps) {
  const resolved = contact ?? getSitePageFallback("contact");
  const socialLinks = resolveSocialLinks(resolved);

  const socialItems = [
    {
      key: "phone",
      href: `tel:${resolved.phone.replace(/\s/g, "")}`,
      label: "Gọi điện",
      icon: <FaPhone className={iconClass} aria-hidden />,
    },
    {
      key: "email",
      href: `mailto:${resolved.email}`,
      label: "Email",
      icon: <Mail className={iconClass} strokeWidth={1.5} aria-hidden />,
    },
    /* Link mạng xã hội từ CMS Liên hệ; ô trống → ẩn icon. */
    ...SOCIAL_KEYS.filter((key) => socialLinks[key]).map((key) => ({
      key,
      href: socialLinks[key],
      label: SOCIAL_LABELS[key],
      icon: SOCIAL_ICONS[key],
    })),
  ];

  return (
    <footer id="site-footer" className={cn("site-footer", className)}>
      <div className="site-footer-bar">
        <div className="site-footer-social">
          {socialItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              target={
                item.key === "phone" || item.key === "email"
                  ? undefined
                  : "_blank"
              }
              rel={
                item.key === "phone" || item.key === "email"
                  ? undefined
                  : "noopener noreferrer"
              }
              aria-label={item.label}
              className="flex h-8 w-8 shrink-0 items-center justify-center text-foreground transition-colors touch-manipulation hover:text-brand-red"
            >
              {item.icon}
            </Link>
          ))}
        </div>
        <Link
          href={siteAdminLoginHref}
          prefetch={false}
          className="site-footer-copyright"
        >
          {siteBrand.copyright}
        </Link>
      </div>
    </footer>
  );
}

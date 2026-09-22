import Link from "next/link";
import { Mail } from "lucide-react";
import { FaBehance, FaFacebookF, FaPhone, FaTiktok } from "react-icons/fa6";
import { RiInstagramLine } from "react-icons/ri";
import { siteAdminLoginHref, siteBrand, siteSocial } from "@/lib/site-content";
import { getSitePageFallback } from "@/lib/site-page-defaults";
import type { ContactPageContent } from "@/lib/validations/site-page";
import { cn } from "@/lib/utils";

interface SiteFooterProps {
  className?: string;
  /** CMS contact; thiếu → fallback `siteContact` */
  contact?: ContactPageContent;
}

const iconClass = "h-4 w-4";

export function SiteFooter({ className, contact }: SiteFooterProps) {
  const resolved = contact ?? getSitePageFallback("contact");

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
    {
      key: "facebook",
      href: siteSocial.facebook,
      label: "Facebook",
      icon: <FaFacebookF className={iconClass} aria-hidden />,
    },
    {
      key: "instagram",
      href: siteSocial.instagram,
      label: "Instagram",
      icon: <RiInstagramLine className={iconClass} aria-hidden />,
    },
    {
      key: "tiktok",
      href: siteSocial.tiktok,
      label: "TikTok",
      icon: <FaTiktok className={iconClass} aria-hidden />,
    },
    ...(siteSocial.behance
      ? [
          {
            key: "behance",
            href: siteSocial.behance,
            label: "Behance",
            icon: <FaBehance className={iconClass} aria-hidden />,
          },
        ]
      : []),
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

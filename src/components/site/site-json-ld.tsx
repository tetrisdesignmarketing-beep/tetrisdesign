import { getSiteContact } from "@/lib/get-site-contact";
import { siteBrand } from "@/lib/site-content";
import { resolveSocialLinks } from "@/lib/social-links";
import { siteUrl } from "@/lib/site-metadata";

export async function SiteJsonLd() {
  const contact = await getSiteContact();

  /* Trang hồ sơ mạng xã hội (Zalo là link nhắn tin, không phải hồ sơ → bỏ). */
  const social = resolveSocialLinks(contact);
  const sameAs = [
    social.facebook,
    social.instagram,
    social.tiktok,
    social.behance,
  ].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: siteBrand.name,
    url: siteUrl,
    email: contact.email,
    telephone: contact.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address,
      addressLocality: "Hà Nội",
      addressCountry: "VN",
    },
    sameAs,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

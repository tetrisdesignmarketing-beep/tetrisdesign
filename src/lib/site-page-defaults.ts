import { resolveContactAddressParts } from "@/lib/contact-address";
import { siteAbout, siteContact } from "@/lib/site-content";
import {
  aboutPageSchema,
  contactPageSchema,
  contactSocialStoredSchema,
  homePageSchema,
  homeSlidesToFormValues,
  servicesPageSchema,
  type AboutPageContent,
  type ContactPageContent,
  type HomePageFormValues,
  type ServicesPageFormValues,
} from "@/lib/validations/site-page";

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getSitePageFallback(slug: "home"): HomePageFormValues;
export function getSitePageFallback(slug: "about"): AboutPageContent;
export function getSitePageFallback(slug: "services"): ServicesPageFormValues;
export function getSitePageFallback(slug: "contact"): ContactPageContent;
export function getSitePageFallback(
  slug: "home" | "about" | "services" | "contact",
):
  | HomePageFormValues
  | AboutPageContent
  | ServicesPageFormValues
  | ContactPageContent {
  switch (slug) {
    case "home": {
      const empty: HomePageFormValues = { slides: [] };
      return empty;
    }
    case "about":
      return aboutPageSchema.parse(cloneJson(siteAbout));
    case "services": {
      const empty: ServicesPageFormValues = { items: [] };
      return empty;
    }
    case "contact": {
      const parts = resolveContactAddressParts({
        address: siteContact.address,
        province: "Hà Nội",
      });
      return contactPageSchema.parse({
        email: siteContact.email,
        phone: siteContact.phone,
        ...parts,
      });
    }
  }
}

/** Chuẩn hoá contact CMS (legacy chỉ có `address` → addressLine + province). */
export function normalizeContactPageContent(
  content: unknown,
): ContactPageContent | null {
  const full = contactPageSchema.safeParse(content);
  if (full.success) {
    return full.data;
  }

  if (!content || typeof content !== "object") {
    return null;
  }

  const row = content as Record<string, unknown>;
  const email = typeof row.email === "string" ? row.email : null;
  const phone = typeof row.phone === "string" ? row.phone : null;
  const address = typeof row.address === "string" ? row.address : undefined;
  const addressLine =
    typeof row.addressLine === "string" ? row.addressLine : undefined;
  const province =
    typeof row.province === "string" ? row.province : undefined;

  if (!email || !phone || (!address && !addressLine)) {
    return null;
  }

  const parts = resolveContactAddressParts({
    address,
    addressLine,
    province,
  });
  /* Giữ link mạng xã hội (nếu có) khi dựng lại từ dữ liệu cũ. */
  const social = contactSocialStoredSchema.safeParse(row.social);

  const parsed = contactPageSchema.safeParse({
    email,
    phone,
    ...parts,
    ...(social.success ? { social: social.data } : null),
  });
  return parsed.success ? parsed.data : null;
}

export function resolveSitePageContent(
  slug: "home",
  content: unknown,
): HomePageFormValues;
export function resolveSitePageContent(
  slug: "about",
  content: unknown,
): AboutPageContent;
export function resolveSitePageContent(
  slug: "services",
  content: unknown,
): ServicesPageFormValues;
export function resolveSitePageContent(
  slug: "contact",
  content: unknown,
): ContactPageContent;
export function resolveSitePageContent(
  slug: "home" | "about" | "services" | "contact",
  content: unknown,
) {
  switch (slug) {
    case "home": {
      const parsed = homePageSchema.safeParse(content);
      if (!parsed.success) return getSitePageFallback("home");
      return homeSlidesToFormValues(parsed.data.slides);
    }
    case "about": {
      const parsed = aboutPageSchema.safeParse(content);
      return parsed.success ? parsed.data : getSitePageFallback("about");
    }
    case "services": {
      const parsed = servicesPageSchema.safeParse(content);
      return parsed.success ? parsed.data : getSitePageFallback("services");
    }
    case "contact": {
      return (
        normalizeContactPageContent(content) ?? getSitePageFallback("contact")
      );
    }
  }
}

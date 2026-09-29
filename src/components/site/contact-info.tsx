import { resolveContactTaxCode } from "@/lib/site-page-defaults";
import { cn } from "@/lib/utils";
import type { ContactPageContent } from "@/lib/validations/site-page";

interface ContactInfoProps {
  contact: ContactPageContent;
  className?: string;
}

export function ContactInfo({ contact, className }: ContactInfoProps) {
  const phoneHref = contact.phone.replace(/\s/g, "");
  const taxCode = resolveContactTaxCode(contact);

  return (
    <section className={cn("contact-info", className)}>
      <div
        className={cn(
          "contact-info-list",
          taxCode && "contact-info-list--4",
        )}
      >
        <p className="contact-info-item">
          <span className="contact-info-label site-label-text">Email:</span>{" "}
          <a
            href={`mailto:${contact.email}`}
            className="contact-info-value"
          >
            {contact.email}
          </a>
        </p>
        <p className="contact-info-item">
          <span className="contact-info-label site-label-text">Số điện thoại:</span>{" "}
          <a href={`tel:${phoneHref}`} className="contact-info-value">
            {contact.phone}
          </a>
        </p>
        <p className="contact-info-item">
          <span className="contact-info-label site-label-text">Địa chỉ:</span>{" "}
          <span className="contact-info-value">{contact.address}</span>
        </p>
        {taxCode ? (
          <p className="contact-info-item">
            <span className="contact-info-label site-label-text">
              Mã số thuế:
            </span>{" "}
            <span className="contact-info-value">{taxCode}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}

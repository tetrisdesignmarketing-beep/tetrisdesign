import { ContactInfo } from "@/components/site/contact-info";
import { ContactMap } from "@/components/site/contact-map";
import { SiteFooter } from "@/components/site/site-footer";
import { getSiteContact } from "@/lib/get-site-contact";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Liên hệ",
  description:
    "Liên hệ Tetris Design — email, điện thoại và địa chỉ văn phòng tại Ba Đình, Hà Nội.",
  path: "/contact",
});

/**
 * Lưu sẵn trang (ISR): phục vụ bản dựng sẵn từ CDN. Admin lưu → API gọi
 * `revalidateSite()` nên lượt xem kế tiếp đã có nội dung mới. 3600s = lưới
 * an toàn: nếu 1 lần dựng gặp lỗi DB (trả dữ liệu dự phòng) thì tự dựng lại
 * sau tối đa 1 giờ.
 */
export const revalidate = 3600;

export default async function ContactPage() {
  const contact = await getSiteContact();

  return (
    <div data-contact-page>
      <ContactMap
        address={contact.address}
        className="mt-[36px] px-[28px] md:mx-auto md:w-full md:max-w-[700px] md:px-0"
      />
      <ContactInfo contact={contact} />
      <SiteFooter contact={contact} />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ADMIN_NAV, getAdminLayoutPage } from "@/lib/admin-nav";
import { AboutPageForm } from "@/components/admin/about-page-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ContactPageForm } from "@/components/admin/contact-page-form";
import { HomePageForm } from "@/components/admin/home-page-form";
import { ServicesPageForm } from "@/components/admin/services-page-form";
import { TypographyForm } from "@/components/admin/typography-form";
import { resolveSitePageContent } from "@/lib/site-page-defaults";
import { isSitePageSlug } from "@/lib/validations/site-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AdminLayoutPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminLayoutPage({
  params,
}: AdminLayoutPageProps) {
  const { slug } = await params;
  const page = getAdminLayoutPage(slug);

  if (!page || !isSitePageSlug(slug)) {
    notFound();
  }

  const row = await prisma.sitePage.findUnique({ where: { slug } });

  return (
    <>
      <AdminPageHeader
        title={page.label}
        description={page.description}
        action={
          <Link href={ADMIN_NAV.layout.href}>
            <Button variant="outline">Quay lại</Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {slug === "projects" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Trang Dự án trên landing lấy danh sách từ Bài đăng — không nhân
                bản form content ở đây.
              </p>
              <Link href={ADMIN_NAV.posts.href}>
                <Button>Tới Bài đăng</Button>
              </Link>
            </div>
          ) : slug === "home" ? (
            <HomePageForm
              initialData={resolveSitePageContent("home", row?.content)}
            />
          ) : slug === "about" ? (
            <AboutPageForm
              initialData={resolveSitePageContent("about", row?.content)}
            />
          ) : slug === "services" ? (
            <ServicesPageForm
              initialData={resolveSitePageContent("services", row?.content)}
            />
          ) : slug === "typography" ? (
            <TypographyForm
              initialData={resolveSitePageContent("typography", row?.content)}
            />
          ) : (
            <ContactPageForm
              initialData={resolveSitePageContent("contact", row?.content)}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}

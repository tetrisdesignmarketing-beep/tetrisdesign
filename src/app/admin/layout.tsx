import Link from "next/link";
import { auth, signOut } from "@/auth";
import { FileText, LogOut } from "lucide-react";
import { AdminMediaDrawer } from "@/components/admin/admin-media-drawer";
import { AdminMediaTrigger } from "@/components/admin/admin-media-trigger";
import { AdminNav } from "@/components/admin/admin-nav";
import { MediaDrawerProvider } from "@/components/admin/media-drawer-context";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <MediaDrawerProvider>
      <div className="min-h-screen bg-muted/30 font-normal">
        <header className="sticky top-0 z-50 border-b bg-background">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
            <div className="flex min-w-0 items-center gap-6">
              <Link
                href="/admin"
                className="flex shrink-0 items-center gap-2 font-semibold"
              >
                <FileText className="h-5 w-5" />
                CMS Admin
              </Link>
              <AdminNav />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <AdminMediaTrigger />
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.email}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/admin/login" });
                }}
              >
                <Button variant="outline" size="sm" type="submit">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <AdminMediaDrawer />
      </div>
    </MediaDrawerProvider>
  );
}

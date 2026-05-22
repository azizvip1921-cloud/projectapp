import "@/styles/globals.css";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { FormVisibilityProvider } from "@/components/FormVisibilityContext";
import AppSidebar from "@/components/AppSidebar";
import PageHeader from "@/components/PageHeader";
import { LanguageProvider } from "@/contexts/LanguageContext";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isLoginPage = router.pathname === "/login";

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="app-theme"
    >
      <LanguageProvider>
        <TooltipProvider>
          <SidebarProvider>
            <FormVisibilityProvider>
              {isLoginPage ? (
                <div className="login-page-wrapper">
                  <Component {...pageProps} />
                </div>
              ) : (
                <>
                  <AppSidebar />
                  <SidebarInset className="min-w-0 overflow-y-auto">
                    <PageHeader alwaysShow />
                    <Component {...pageProps} />
                  </SidebarInset>
                </>
              )}
              <Toaster position="top-center" richColors closeButton />
            </FormVisibilityProvider>
          </SidebarProvider>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

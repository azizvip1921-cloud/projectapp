import "@/styles/globals.css";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { FormVisibilityProvider } from "@/components/FormVisibilityContext";
import AppSidebar from "@/components/AppSidebar";
import PageHeader from "@/components/PageHeader";
import { LanguageProvider } from "@/contexts/LanguageContext";

export default function App({ Component, pageProps }) {
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
              <AppSidebar />
              <SidebarInset className="min-w-0 overflow-y-auto">
                <PageHeader alwaysShow />
                <Component {...pageProps} />
              </SidebarInset>
              <Toaster position="top-right" richColors />
            </FormVisibilityProvider>
          </SidebarProvider>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

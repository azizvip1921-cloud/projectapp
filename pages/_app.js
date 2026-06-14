import "@/styles/globals.css";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { toast } from "sonner";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { FormVisibilityProvider } from "@/components/FormVisibilityContext";
import AppSidebar from "@/components/AppSidebar";
import PageHeader from "@/components/PageHeader";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";

// Patch toast once at module level so all components go through our wrapper
let _viewerBlocked = false;
const _origError   = toast.error.bind(toast);
const _origSuccess = toast.success.bind(toast);
const _origWarning = (toast.warning || (() => {})).bind(toast);
toast.error   = (...a) => { if (!_viewerBlocked) _origError(...a); };
toast.success = (...a) => { if (!_viewerBlocked) _origSuccess(...a); };
toast.warning = (...a) => { if (!_viewerBlocked) _origWarning(...a); };

// Updated by ViewerGuard when language changes
let _viewerMsgFn = () => "Viewer cannot add, edit, or delete.";

// Set up fetch interceptor at module level (before React mounts) — client side only
if (typeof window !== "undefined") {
  const _nativeFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    const method = (options?.method || "GET").toUpperCase();
    const isWrite = method !== "GET";
    const isApi = typeof url === "string" && url.startsWith("/api/") && !url.startsWith("/api/auth/");

    if (isWrite && isApi) {
      try {
        const user = JSON.parse(localStorage.getItem("hr_user") || "{}");
        if (user.source === "system" && user.role === "Viewer") {
          _origError(_viewerMsgFn());
          _viewerBlocked = true;
          setTimeout(() => { _viewerBlocked = false; }, 800);
          return { ok: false, status: 403, json: async () => ({}), text: async () => "", clone() { return this; } };
        }
      } catch {}
    }

    return _nativeFetch(...args);
  };
}

function ViewerGuard() {
  const { t } = useLanguage();
  useEffect(() => {
    _viewerMsgFn = () => t.viewer_no_permission;
  }, [t]);
  return null;
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isLoginPage = router.pathname === "/login";

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="app-theme"
      >
        <LanguageProvider>
          <ViewerGuard />
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
    </>
  );
}

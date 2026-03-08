import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider, useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { StrictMode, lazy, Suspense, useMemo, useEffect, useRef } from "react";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePWA } from "@/hooks/use-pwa";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const THEME_MOTION_STORAGE_KEY = "theme-motion-intensity";
type ThemeMotionIntensity = "off" | "soft" | "strong";

function getThemeMotionIntensity(): ThemeMotionIntensity {
  const fallback: ThemeMotionIntensity = "soft";

  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window.localStorage.getItem(THEME_MOTION_STORAGE_KEY);
  if (value === "off") {
    return "off";
  }
  return value === "strong" ? "strong" : fallback;
}

// Lazy load da página principal (inclui recharts via StatsDashboard)
const Index = lazy(() => import("./pages/Index"));

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center">Carregando...</div>
);

function AppRoutes() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  usePWA(); // ✅ Registrar service worker e detectar atualizações

  // Memoizar router para não recriar a cada render
  const router = useMemo(
    () =>
      createBrowserRouter(
        [
          {
            path: "/",
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <Index user={user!} onSignOut={signOut} />
              </Suspense>
            ),
          },
          { path: "*", element: <NotFound /> },
        ],
        { future: { v7_startTransition: true } }
      ),
    [user, signOut]
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Auth onSignIn={signIn} onSignUp={signUp} />;
  }

  return <RouterProvider router={router} />;
}

function ThemeTransitionEffect() {
  const { theme } = useTheme();
  const firstRender = useRef(true);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme-motion", getThemeMotionIntensity());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const intensity = getThemeMotionIntensity();
    if (intensity === "off") {
      root.classList.remove("theme-switching");
      root.setAttribute("data-theme-motion", "off");
      firstRender.current = false;
      return;
    }

    const duration = intensity === "strong" ? 520 : 300;
    root.setAttribute("data-theme-motion", intensity);

    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    root.classList.add("theme-switching");

    const timer = window.setTimeout(() => {
      root.classList.remove("theme-switching");
    }, duration);

    return () => window.clearTimeout(timer);
  }, [theme]);

  return null;
}

const App = () => (
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        themes={["light", "paper", "mint", "peach", "dark", "ocean", "sunset", "forest", "rose", "lavender", "midnight"]}
      >
        <ThemeTransitionEffect />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);

export default App;

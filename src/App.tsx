import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { StrictMode, lazy, Suspense, useMemo } from "react";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePWA } from "@/hooks/use-pwa";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

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

const App = () => (
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        themes={["light", "dark", "ocean", "sunset", "forest", "rose", "lavender", "midnight"]}
      >
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

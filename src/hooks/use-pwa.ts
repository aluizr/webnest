import { useEffect, useState } from "react";
// @ts-ignore - virtual module provided by vite-plugin-pwa at build time
// import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

/**
 * Hook para gerenciar o Service Worker do PWA.
 * - Detecta novas versões disponíveis
 * - Oferece atualização ao usuário
 * - Auto-atualiza a cada 60 minutos
 */
export function usePWA() {
  const [needRefresh, setNeedRefresh] = useState(false);

  const {
    needRefresh: [swNeedRefresh, setSwNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Verificar atualizações a cada 60 minutos
    onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error: any) {
      console.error("Service Worker registration error:", error);
    },
  });

  useEffect(() => {
    if (swNeedRefresh) {
      setNeedRefresh(true);
      toast("Nova versão disponível!", {
        description: "Clique para atualizar o WebNest.",
        action: {
          label: "Atualizar",
          onClick: () => {
            updateServiceWorker(true);
          },
        },
        duration: Infinity,
      });
    }
  }, [swNeedRefresh, updateServiceWorker]);

  const update = () => {
    updateServiceWorker(true);
  };

  const dismiss = () => {
    setNeedRefresh(false);
    setSwNeedRefresh(false);
  };

  return { needRefresh, update, dismiss };
}

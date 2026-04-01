import { useState, useEffect } from "react";

/**
 * Hook para detectar se o rate limit do Microlink foi atingido
 */
export function useMicrolinkRateLimit() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState<number | null>(null);

  useEffect(() => {
    // Verificar se há flag de rate limit
    const checkRateLimit = () => {
      const rateLimitStr = localStorage.getItem("webnest:microlink_rate_limit");
      if (rateLimitStr) {
        const timestamp = parseInt(rateLimitStr, 10);
        const now = Date.now();
        const hoursSince = (now - timestamp) / (1000 * 60 * 60);
        
        // Rate limit dura 24 horas
        if (hoursSince < 24) {
          setIsRateLimited(true);
          setRateLimitTime(timestamp);
        } else {
          // Limpar flag expirada
          localStorage.removeItem("webnest:microlink_rate_limit");
          setIsRateLimited(false);
          setRateLimitTime(null);
        }
      }
    };

    checkRateLimit();

    // Verificar a cada minuto
    const interval = setInterval(checkRateLimit, 60000);

    return () => clearInterval(interval);
  }, []);

  const dismiss = () => {
    setIsRateLimited(false);
  };

  const getTimeRemaining = (): string => {
    if (!rateLimitTime) return "";
    
    const now = Date.now();
    const resetTime = rateLimitTime + (24 * 60 * 60 * 1000);
    const msRemaining = resetTime - now;
    
    if (msRemaining <= 0) return "em breve";
    
    const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursRemaining > 0) {
      return `em ${hoursRemaining}h ${minutesRemaining}min`;
    }
    return `em ${minutesRemaining} minutos`;
  };

  return {
    isRateLimited,
    dismiss,
    timeRemaining: getTimeRemaining(),
  };
}

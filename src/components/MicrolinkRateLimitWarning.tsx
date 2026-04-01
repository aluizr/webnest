import { AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface MicrolinkRateLimitWarningProps {
  onDismiss: () => void;
  timeRemaining?: string;
}

export function MicrolinkRateLimitWarning({ onDismiss, timeRemaining }: MicrolinkRateLimitWarningProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Limite de API Atingido</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>
          A API do Microlink atingiu o limite de 50 requisições/dia. 
          Novos links usarão fallbacks alternativos (HTML direto, Noembed, etc).
        </p>
        <p className="text-sm">
          Links já salvos continuam funcionando normalmente.
          {timeRemaining && ` O limite será resetado ${timeRemaining}.`}
        </p>
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://microlink.io/pricing', '_blank')}
          >
            Ver Planos Microlink
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
          >
            Entendi
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Image, AlertCircle, CheckCircle, XCircle, RefreshCw, Wand2 } from "lucide-react";
import { useMetadata } from "@/hooks/use-metadata";
import { toast } from "sonner";
import type { LinkItem } from "@/types/link";

interface LinkDiagnosticsProps {
  links: LinkItem[];
  onUpdateLink: (id: string, data: Partial<LinkItem>) => void;
}

interface DiagnosticResult {
  link: LinkItem;
  hasOgImage: boolean;
  hasFavicon: boolean;
  ogImageStatus: "loading" | "success" | "error" | "empty";
  faviconStatus: "loading" | "success" | "error" | "empty";
  ogImageError?: string;
  faviconError?: string;
}

export function LinkDiagnostics({ links, onUpdateLink }: LinkDiagnosticsProps) {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [filter, setFilter] = useState<"all" | "missing-thumb" | "missing-favicon">("all");
  const [fixing, setFixing] = useState<Set<string>>(new Set());
  const { fetchMetadata } = useMetadata();

  const checkImage = async (url: string): Promise<{ status: "success" | "error"; error?: string }> => {
    if (!url) return { status: "error", error: "URL vazia" };

    // Don't use crossOrigin to avoid forcing CORS checks
    // Images that fail to load might be CORS issues
    return new Promise((resolve) => {
      const img = document.createElement("img");
      
      const timeout = setTimeout(() => {
        img.src = "";
        resolve({ status: "error", error: "Timeout (5s)" });
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve({ status: "success" });
      };

      img.onerror = () => {
        clearTimeout(timeout);
        // Most image loading failures are due to CORS or 404
        resolve({ status: "error", error: "Falha ao carregar (CORS?)" });
      };

      img.src = url;
    });
  };

  const runDiagnostics = async () => {
    setChecking(true);
    const diagnostics: DiagnosticResult[] = [];

    for (const link of links) {
      const hasOgImage = Boolean(link.ogImage && link.ogImage.trim());
      const hasFavicon = Boolean(link.favicon && link.favicon.trim());

      let ogImageStatus: DiagnosticResult["ogImageStatus"] = "empty";
      let faviconStatus: DiagnosticResult["faviconStatus"] = "empty";
      let ogImageError: string | undefined;
      let faviconError: string | undefined;

      if (hasOgImage) {
        ogImageStatus = "loading";
        const result = await checkImage(link.ogImage);
        ogImageStatus = result.status;
        ogImageError = result.error;
      }

      if (hasFavicon) {
        faviconStatus = "loading";
        const result = await checkImage(link.favicon);
        faviconStatus = result.status;
        faviconError = result.error;
      }

      diagnostics.push({
        link,
        hasOgImage,
        hasFavicon,
        ogImageStatus,
        faviconStatus,
        ogImageError,
        faviconError,
      });
    }

    setResults(diagnostics);
    setChecking(false);
  };

  const fixLink = async (linkId: string, url: string) => {
    setFixing((prev) => new Set(prev).add(linkId));
    
    try {
      toast.info("Buscando metadados novamente...");
      
      // Fetch fresh metadata
      const metadata = await fetchMetadata(url);
      
      if (metadata.title || metadata.image || metadata.favicon) {
        // Update the link with new metadata
        onUpdateLink(linkId, {
          title: metadata.title || undefined,
          ogImage: metadata.image || "",
          favicon: metadata.favicon || "",
          description: metadata.description || "",
        });
        
        toast.success("Metadados atualizados!");
        
        // Re-run diagnostics for this link
        await runDiagnostics();
      } else {
        toast.warning("Não foi possível obter metadados");
      }
    } catch (err) {
      console.error("Error fixing link:", err);
      toast.error("Erro ao buscar metadados");
    } finally {
      setFixing((prev) => {
        const next = new Set(prev);
        next.delete(linkId);
        return next;
      });
    }
  };

  const cleanProxyUrl = (imageUrl: string): string => {
    if (!imageUrl) return imageUrl;
    
    try {
      const url = new URL(imageUrl);
      
      // Next.js Image Optimization: /_next/image?url=...
      if (url.pathname.includes('/_next/image')) {
        const originalUrl = url.searchParams.get('url');
        if (originalUrl) {
          return originalUrl.startsWith('http') ? originalUrl : imageUrl;
        }
      }
      
      // Vercel Image Optimization
      if (url.pathname.includes('/_vercel/image')) {
        const originalUrl = url.searchParams.get('url');
        if (originalUrl) {
          return originalUrl.startsWith('http') ? originalUrl : imageUrl;
        }
      }
      
      return imageUrl;
    } catch {
      return imageUrl;
    }
  };

  const fixProxyUrls = async () => {
    const proxyLinks = results.filter(
      (r) => r.hasOgImage && 
             (r.link.ogImage.includes('/_next/image') || 
              r.link.ogImage.includes('/_vercel/image') ||
              r.link.ogImage.includes('/cdn-cgi/image'))
    );
    
    if (proxyLinks.length === 0) {
      toast.info("Nenhuma URL de proxy encontrada");
      return;
    }

    toast.info(`Limpando ${proxyLinks.length} URLs de proxy...`);
    
    for (const result of proxyLinks) {
      const cleanedUrl = cleanProxyUrl(result.link.ogImage);
      if (cleanedUrl !== result.link.ogImage) {
        setFixing((prev) => new Set(prev).add(result.link.id));
        onUpdateLink(result.link.id, { ogImage: cleanedUrl });
        setFixing((prev) => {
          const next = new Set(prev);
          next.delete(result.link.id);
          return next;
        });
      }
    }
    
    await runDiagnostics();
    toast.success("URLs de proxy limpas!");
  };

  const forceProxy = async (linkId: string, ogImageUrl: string) => {
    setFixing((prev) => new Set(prev).add(linkId));
    
    try {
      // Route through proxy
      const proxiedUrl = `/og-proxy?url=${encodeURIComponent(ogImageUrl)}`;
      
      // Test if proxy works
      const result = await checkImage(proxiedUrl);
      
      if (result.status === "success") {
        onUpdateLink(linkId, { ogImage: proxiedUrl });
        toast.success("Imagem roteada pelo proxy!");
        await runDiagnostics();
      } else {
        toast.error("Proxy também falhou: " + result.error);
      }
    } catch (err) {
      console.error("Error proxying image:", err);
      toast.error("Erro ao rotear pelo proxy");
    } finally {
      setFixing((prev) => {
        const next = new Set(prev);
        next.delete(linkId);
        return next;
      });
    }
  };

  const autoFixCORS = async () => {
    const corsLinks = results.filter(
      (r) => r.hasOgImage && 
             r.ogImageStatus === "error" && 
             !r.link.ogImage.startsWith("/og-proxy")
    );
    
    if (corsLinks.length === 0) {
      toast.info("Nenhuma imagem com erro encontrada");
      return;
    }

    toast.info(`Corrigindo ${corsLinks.length} imagens via proxy...`);
    
    for (const result of corsLinks) {
      await forceProxy(result.link.id, result.link.ogImage);
    }
    
    toast.success("Correção via proxy concluída!");
  };

  const fixAllBroken = async () => {
    const brokenLinks = results.filter(
      (r) => (!r.hasOgImage || r.ogImageStatus === "error") && r.link.url
    );
    
    if (brokenLinks.length === 0) {
      toast.info("Nenhum link quebrado encontrado");
      return;
    }

    toast.info(`Corrigindo ${brokenLinks.length} links...`);
    
    for (const result of brokenLinks) {
      await fixLink(result.link.id, result.link.url);
    }
    
    toast.success("Correção em lote concluída!");
  };

  const filteredResults = results.filter((r) => {
    if (filter === "missing-thumb") return !r.hasOgImage || r.ogImageStatus === "error";
    if (filter === "missing-favicon") return !r.hasFavicon || r.faviconStatus === "error";
    return true;
  });

  const stats = {
    total: results.length,
    missingThumb: results.filter((r) => !r.hasOgImage || r.ogImageStatus === "error").length,
    missingFavicon: results.filter((r) => !r.hasFavicon || r.faviconStatus === "error").length,
    corsErrors: results.filter((r) => r.hasOgImage && r.ogImageStatus === "error" && !r.link.ogImage.startsWith("/og-proxy")).length,
    proxyUrls: results.filter((r) => r.hasOgImage && (r.link.ogImage.includes('/_next/image') || r.link.ogImage.includes('/_vercel/image') || r.link.ogImage.includes('/cdn-cgi/image'))).length,
    allGood: results.filter((r) => r.hasOgImage && r.ogImageStatus === "success" && r.hasFavicon && r.faviconStatus === "success").length,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico de Links</CardTitle>
          <CardDescription>
            Verifica quais links têm thumbnails e favicons funcionando
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={runDiagnostics} disabled={checking || links.length === 0}>
              {checking ? "Verificando..." : "Iniciar Diagnóstico"}
            </Button>
            
            {results.length > 0 && stats.proxyUrls > 0 && (
              <Button 
                onClick={fixProxyUrls} 
                disabled={fixing.size > 0}
                variant="default"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Limpar Proxies ({stats.proxyUrls})
              </Button>
            )}
            
            {results.length > 0 && stats.corsErrors > 0 && (
              <Button 
                onClick={autoFixCORS} 
                disabled={fixing.size > 0}
                variant="default"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Forçar Proxy ({stats.corsErrors})
              </Button>
            )}
            
            {results.length > 0 && stats.missingThumb > 0 && (
              <Button 
                onClick={fixAllBroken} 
                disabled={fixing.size > 0}
                variant="secondary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-buscar Todos ({stats.missingThumb})
              </Button>
            )}
          </div>

          {results.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total de links</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{stats.allGood}</div>
                    <div className="text-xs text-muted-foreground">Tudo OK</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-amber-600">{stats.missingThumb}</div>
                    <div className="text-xs text-muted-foreground">Sem thumbnail</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-purple-600">{stats.proxyUrls}</div>
                    <div className="text-xs text-muted-foreground">URLs de proxy</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">{stats.corsErrors}</div>
                    <div className="text-xs text-muted-foreground">Imagens quebradas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-orange-600">{stats.missingFavicon}</div>
                    <div className="text-xs text-muted-foreground">Sem favicon</div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  Todos ({results.length})
                </Button>
                <Button
                  variant={filter === "missing-thumb" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("missing-thumb")}
                >
                  Sem Thumb ({stats.missingThumb})
                </Button>
                <Button
                  variant={filter === "missing-favicon" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("missing-favicon")}
                >
                  Sem Favicon ({stats.missingFavicon})
                </Button>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredResults.map((result) => {
                  const isFixing = fixing.has(result.link.id);
                  const canFix = !result.hasOgImage || result.ogImageStatus === "error";
                  const canProxy = result.hasOgImage && result.ogImageStatus === "error" && !result.link.ogImage.startsWith("/og-proxy");
                  
                  return (
                    <Card key={result.link.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <a
                                href={result.link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium hover:underline truncate"
                              >
                                {result.link.title || result.link.url}
                              </a>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </div>
                            <div className="text-xs text-muted-foreground truncate mb-2">
                              {result.link.url}
                            </div>
                            <div className="flex gap-2 flex-wrap mb-2">
                              <Badge variant={result.ogImageStatus === "success" ? "default" : result.ogImageStatus === "error" ? "destructive" : "secondary"}>
                                <Image className="h-3 w-3 mr-1" />
                                Thumb: {result.hasOgImage ? (
                                  result.ogImageStatus === "success" ? "OK" : result.ogImageError || "Erro"
                                ) : "Vazio"}
                              </Badge>
                              <Badge variant={result.faviconStatus === "success" ? "default" : result.faviconStatus === "error" ? "destructive" : "secondary"}>
                                {result.faviconStatus === "success" ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                Favicon: {result.hasFavicon ? (result.faviconStatus === "success" ? "OK" : result.faviconError || "Erro") : "Vazio"}
                              </Badge>
                            </div>
                            
                            {canFix && (
                              <div className="flex gap-2 mb-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fixLink(result.link.id, result.link.url)}
                                  disabled={isFixing}
                                >
                                  <RefreshCw className={`h-3 w-3 mr-1 ${isFixing ? "animate-spin" : ""}`} />
                                  {isFixing ? "Corrigindo..." : "Re-buscar Metadados"}
                                </Button>
                                
                                {canProxy && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => forceProxy(result.link.id, result.link.ogImage)}
                                    disabled={isFixing}
                                  >
                                    <Wand2 className="h-3 w-3 mr-1" />
                                    Forçar Proxy
                                  </Button>
                                )}
                              </div>
                            )}
                            
                            {result.hasOgImage && (
                              <div className="text-xs text-muted-foreground mt-2 truncate">
                                OG Image: {result.link.ogImage}
                              </div>
                            )}
                          </div>
                          {result.hasOgImage && result.ogImageStatus === "success" && (
                            <img
                              src={result.link.ogImage.startsWith("/og-proxy") ? result.link.ogImage : `/og-proxy?url=${encodeURIComponent(result.link.ogImage)}`}
                              alt=""
                              className="w-20 h-20 object-cover rounded flex-shrink-0"
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

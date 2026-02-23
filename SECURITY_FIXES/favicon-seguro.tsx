// src/components/LinkCard.tsx - AJUSTE PARA FAVICONS MAIS SEGUROS
// Substitua a linha de favicon por esta versão melhorada

// ✅ Versão 1: Usar serviço mais privado
// Altere a linha do favicon no LinkCard.tsx de:
//   const faviconUrl = link.favicon || `https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=32`;
// Para:
//   const faviconUrl = getFaviconUrl(link);

// Adicione esta função ao arquivo:

/**
 * Define o tipo LinkItem para uso na função getFaviconUrl
 */
interface LinkItem {
  url: string;
  favicon?: string;
}

/**
 * Obtém URL do favicon com prioridade para privacidade
 * 1. Se temos favicon customizado, usa
 * 2. Tenta usar serviço privado (self-hosted seria ideal)
 * 3. Fallback para placeholder
 */
function getFaviconUrl(link: LinkItem): string {
  if (link.favicon && link.favicon.startsWith('http')) {
    return link.favicon;
  }
  
  try {
    const hostname = new URL(link.url).hostname;
    if (!hostname) return '/placeholder.svg';
    
    // ✅ Opção 1: Serviço mais privado (icon.horse)
    // Alternativa: https://icon.horse/icon/${hostname}
    
    // ✅ Opção 2: Se tiver backend próprio:
    // return `/api/favicon/${encodeURIComponent(hostname)}`;
    
    // ✅ Opção 3: Armazenar em bucket público do Supabase:
    // return `${SUPABASE_URL}/storage/v1/object/public/favicons/${hostname}.png`;
    
    // Usar icon.horse por padrão (mais privado que Google)
    return `https://icon.horse/icon/${hostname}?size=32`;
    
  } catch {
    return '/placeholder.svg';
  }
}

// ✅ Alternativa mais segura: Baixar e armazenar favicons no backend
// Criar um hook para gerenciar favicons:

import { useEffect, useState } from 'react';

export function useFaviconUrl(url: string, storedFavicon?: string) {
  const [faviconUrl, setFaviconUrl] = useState<string>(storedFavicon || '');
  const [loading, setLoading] = useState(!storedFavicon);
  
  useEffect(() => {
    if (storedFavicon) {
      setFaviconUrl(storedFavicon);
      return;
    }
    
    const fetchFavicon = async () => {
      try {
        const hostname = new URL(url).hostname;
        if (!hostname) {
          setFaviconUrl('/placeholder.svg');
          return;
        }
        
        // ✅ Usar backend para buscar favicon com mais segurança
        // const response = await fetch(`/api/favicon`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ url })
        // });
        
        // Por enquanto, usar serviço externo
        setFaviconUrl(`https://icon.horse/icon/${hostname}?size=32`);
        
      } catch (error) {
        console.error('Erro ao carregar favicon:', error);
        setFaviconUrl('/placeholder.svg');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFavicon();
  }, [url, storedFavicon]);
  
  return { faviconUrl, loading };
}

// Usar no LinkCard:
// const { faviconUrl } = useFaviconUrl(link.url, link.favicon);

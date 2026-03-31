import { createClient } from '@supabase/supabase-js';
import https from 'https';
import http from 'http';
import { readFileSync } from 'fs';

// Carregar variáveis de ambiente do .env
const envFile = readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// Configuração do Supabase
const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  console.error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env');
  console.error('Encontradas:', envVars);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Verifica se uma URL de imagem é válida e carrega
 */
async function checkImageUrl(url) {
  if (!url) return { valid: false, reason: 'URL vazia' };
  
  // Validar formato da URL
  try {
    new URL(url);
  } catch {
    return { valid: false, reason: 'URL inválida' };
  }

  // Verificar se é uma URL de proxy local
  if (url.startsWith('/og-proxy') || url.startsWith('/html-proxy')) {
    return { valid: true, reason: 'Proxy local (não verificável offline)' };
  }

  // Verificar se a imagem carrega
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.get(url, { timeout: 5000 }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ valid: true, reason: `HTTP ${res.statusCode}` });
        } else {
          resolve({ valid: false, reason: `HTTP ${res.statusCode}` });
        }
        res.resume(); // Consumir resposta
      });

      req.on('error', (err) => {
        resolve({ valid: false, reason: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ valid: false, reason: 'Timeout' });
      });
    } catch (err) {
      resolve({ valid: false, reason: err.message });
    }
  });
}

/**
 * Verifica todos os links do banco de dados
 */
async function checkAllThumbnails() {
  console.log('🔍 Buscando links do banco de dados...\n');

  // Tentar buscar com diferentes configurações
  const { data: links, error } = await supabase
    .from('links')
    .select('id, url, og_image, favicon, title')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar links:', error.message);
    console.error('Detalhes:', error);
    
    // Tentar listar tabelas disponíveis
    console.log('\n🔍 Tentando verificar conexão...');
    const { data: testData, error: testError } = await supabase
      .from('links')
      .select('count');
    
    if (testError) {
      console.error('❌ Erro de conexão:', testError);
    } else {
      console.log('✅ Conexão OK, mas nenhum link encontrado');
    }
    
    process.exit(1);
  }

  if (!links || links.length === 0) {
    console.log('⚠️  Nenhum link encontrado no banco de dados');
    console.log('Verifique se:');
    console.log('  1. O banco de dados tem dados');
    console.log('  2. As credenciais estão corretas');
    console.log('  3. A tabela "links" existe');
    process.exit(0);
  }

  console.log(`📊 Total de links: ${links.length}\n`);

  const results = {
    total: links.length,
    withThumbnail: 0,
    withoutThumbnail: 0,
    validThumbnails: 0,
    invalidThumbnails: 0,
    withFavicon: 0,
    withoutFavicon: 0,
    problems: []
  };

  console.log('🔎 Verificando thumbnails...\n');

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const progress = `[${i + 1}/${links.length}]`;
    
    // Verificar thumbnail
    if (link.og_image) {
      results.withThumbnail++;
      process.stdout.write(`${progress} Verificando: ${link.title || link.url}... `);
      
      const check = await checkImageUrl(link.og_image);
      
      if (check.valid) {
        results.validThumbnails++;
        console.log(`✅ ${check.reason}`);
      } else {
        results.invalidThumbnails++;
        console.log(`❌ ${check.reason}`);
        results.problems.push({
          id: link.id,
          url: link.url,
          title: link.title,
          thumbnail: link.og_image,
          reason: check.reason,
          type: 'thumbnail'
        });
      }
    } else {
      results.withoutThumbnail++;
      console.log(`${progress} ⚠️  Sem thumbnail: ${link.title || link.url}`);
      results.problems.push({
        id: link.id,
        url: link.url,
        title: link.title,
        thumbnail: null,
        reason: 'Sem thumbnail',
        type: 'missing'
      });
    }

    // Verificar favicon
    if (link.favicon) {
      results.withFavicon++;
    } else {
      results.withoutFavicon++;
    }
  }

  // Relatório final
  console.log('\n' + '='.repeat(80));
  console.log('📊 RELATÓRIO FINAL');
  console.log('='.repeat(80));
  console.log(`Total de links: ${results.total}`);
  console.log(`\nThumbnails:`);
  console.log(`  ✅ Com thumbnail: ${results.withThumbnail} (${((results.withThumbnail / results.total) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Sem thumbnail: ${results.withoutThumbnail} (${((results.withoutThumbnail / results.total) * 100).toFixed(1)}%)`);
  console.log(`  ✅ Válidas: ${results.validThumbnails}`);
  console.log(`  ❌ Inválidas: ${results.invalidThumbnails}`);
  console.log(`\nFavicons:`);
  console.log(`  ✅ Com favicon: ${results.withFavicon} (${((results.withFavicon / results.total) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Sem favicon: ${results.withoutFavicon} (${((results.withoutFavicon / results.total) * 100).toFixed(1)}%)`);

  if (results.problems.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  PROBLEMAS ENCONTRADOS');
    console.log('='.repeat(80));
    
    const missingThumbs = results.problems.filter(p => p.type === 'missing');
    const invalidThumbs = results.problems.filter(p => p.type === 'thumbnail');

    if (missingThumbs.length > 0) {
      console.log(`\n📋 Links sem thumbnail (${missingThumbs.length}):`);
      missingThumbs.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.title || p.url}`);
        console.log(`     URL: ${p.url}`);
        console.log(`     ID: ${p.id}`);
      });
    }

    if (invalidThumbs.length > 0) {
      console.log(`\n❌ Thumbnails inválidas (${invalidThumbs.length}):`);
      invalidThumbs.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.title || p.url}`);
        console.log(`     URL: ${p.url}`);
        console.log(`     Thumbnail: ${p.thumbnail}`);
        console.log(`     Motivo: ${p.reason}`);
        console.log(`     ID: ${p.id}`);
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Verificação concluída!');
  console.log('='.repeat(80) + '\n');
}

// Executar verificação
checkAllThumbnails().catch(console.error);

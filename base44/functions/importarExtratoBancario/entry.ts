import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      arquivo_url,
      banco,
      numero_conta,
      tipo_arquivo // 'ofx' | 'csv'
    } = await req.json();

    // Validações
    if (!arquivo_url) {
      return Response.json({ error: 'URL do arquivo obrigatória' }, { status: 400 });
    }

    if (!banco) {
      return Response.json({ error: 'Banco obrigatório' }, { status: 400 });
    }

    if (!tipo_arquivo || !['ofx', 'csv'].includes(tipo_arquivo)) {
      return Response.json({ error: 'Tipo de arquivo deve ser OFX ou CSV' }, { status: 400 });
    }

    // Busca workshop do usuário
    const workshop_id = user.data?.workshop_id;
    if (!workshop_id) {
      return Response.json({ error: 'Usuário sem workshop' }, { status: 400 });
    }

    // Download do arquivo
    const arquivoResponse = await fetch(arquivo_url);
    const arquivoTexto = await arquivoResponse.text();

    // Parse do arquivo
    let transacoes = [];
    
    if (tipo_arquivo === 'ofx') {
      transacoes = parseOFX(arquivoTexto);
    } else if (tipo_arquivo === 'csv') {
      transacoes = parseCSV(arquivoTexto);
    }

    if (transacoes.length === 0) {
      return Response.json({ 
        error: 'Nenhuma transação encontrada no arquivo',
        detalhe: 'Verifique o formato do arquivo'
      }, { status: 400 });
    }

    // Cria BankTransaction para cada transação
    const bankTransactions = transacoes.map(t => ({
      workshop_id,
      banco,
      numero_conta: numero_conta || '',
      tipo: t.tipo, // credito | debito
      valor: t.valor,
      data_operacao: t.data_operacao,
      data_lancamento: t.data_lancamento || t.data_operacao,
      descricao: t.descricao,
      numero_documento: t.numero_documento || '',
      categoria_bancaria: t.categoria || '',
      status_conciliacao: 'pendente',
      metadados: t.metadados || {}
    }));

    // Bulk create
    const transacoesCriadas = await base44.entities.BankTransaction.bulkCreate(bankTransactions);

    // Tenta conciliação automática
    const conciliacao = await conciliarAutomatico(base44, workshop_id, banco);

    return Response.json({
      success: true,
      total_transacoes: transacoesCriadas.length,
      conciliadas: conciliacao.conciliadas,
      pendentes: conciliacao.pendentes,
      divergentes: conciliacao.divergentes,
      transacoes_ids: transacoesCriadas.map(t => t.id)
    });

  } catch (error) {
    console.error('Erro ao importar extrato:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Parser OFX
function parseOFX(texto) {
  const transacoes = [];
  
  // Extrai blocos STMTTRN do OFX
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;
  
  while ((match = stmttrnRegex.exec(texto)) !== null) {
    const bloco = match[1];
    
    // Extrai campos
    const trntype = extrairTag(bloco, 'TRNTYPE');
    const dtposted = extrairTag(bloco, 'DTPOSTED');
    const trnamt = extrairTag(bloco, 'TRNAMT');
    const fitid = extrairTag(bloco, 'FITID');
    const name = extrairTag(bloco, 'NAME');
    const memo = extrairTag(bloco, 'MEMO');
    const checknum = extrairTag(bloco, 'CHECKNUM');
    
    // Converte tipo
    const tipo = trntype === 'CREDIT' ? 'credito' : 'debito';
    
    // Converte valor (OFX usa ponto decimal)
    const valor = parseFloat(trnamt) || 0;
    
    // Converte data (OFX: YYYYMMDDHHMMSS)
    const data_operacao = converterDataOFX(dtposted);
    
    // Descrição
    const descricao = name || memo || '';
    
    transacoes.push({
      tipo,
      valor: Math.abs(valor),
      data_operacao,
      data_lancamento: data_operacao,
      descricao,
      numero_documento: fitid || checknum || '',
      metadados: {
        id_transacao_banco: fitid,
        tipo_transacao: trntype,
        check_number: checknum
      }
    });
  }
  
  return transacoes;
}

// Parser CSV (formato genérico)
function parseCSV(texto) {
  const transacoes = [];
  const linhas = texto.split('\n').filter(l => l.trim());
  
  // Assume cabeçalho na primeira linha
  if (linhas.length < 2) return [];
  
  const cabecalho = linhas[0].split(',').map(h => h.trim().toLowerCase());
  
  // Mapeia colunas
  const idxData = cabecalho.findIndex(h => h.includes('data') || h.includes('date'));
  const idxDescricao = cabecalho.findIndex(h => h.includes('descricao') || h.includes('description') || h.includes('histórico'));
  const idxValor = cabecalho.findIndex(h => h.includes('valor') || h.includes('value') || h.includes('amount'));
  const idxTipo = cabecalho.findIndex(h => h.includes('tipo') || h.includes('type') || h.includes('débito') || h.includes('crédito'));
  const idxDocumento = cabecalho.findIndex(h => h.includes('documento') || h.includes('doc') || h.includes('nosso número'));
  
  // Processa linhas
  for (let i = 1; i < linhas.length; i++) {
    const colunas = linhas[i].split(',').map(c => c.trim());
    
    if (colunas.length < cabecalho.length) continue;
    
    // Extrai dados
    const data_raw = colunas[idxData] || '';
    const descricao = colunas[idxDescricao] || '';
    let valor_raw = colunas[idxValor] || '0';
    const tipo_raw = colunas[idxTipo] || '';
    const documento = colunas[idxDocumento] || '';
    
    // Converte data (assume DD/MM/YYYY)
    const data_operacao = converterDataCSV(data_raw);
    
    // Converte valor (remove R$, troca vírgula por ponto)
    valor_raw = valor_raw.replace(/R\$/g, '').replace(/\./g, '').replace(',', '.');
    const valor = Math.abs(parseFloat(valor_raw) || 0);
    
    // Determina tipo
    const tipo = tipo_raw.toLowerCase().includes('crédito') || 
                 tipo_raw.toLowerCase().includes('c') ||
                 valor_raw.includes('-') ? 'debito' : 'credito';
    
    transacoes.push({
      tipo,
      valor,
      data_operacao,
      data_lancamento: data_operacao,
      descricao,
      numero_documento: documento,
      metadados: {}
    });
  }
  
  return transacoes;
}

// Helpers
function extrairTag(texto, tag) {
  const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i');
  const match = texto.match(regex);
  return match ? match[1].trim() : '';
}

function converterDataOFX(dataOFX) {
  // OFX: YYYYMMDDHHMMSS
  if (!dataOFX || dataOFX.length < 8) return '';
  
  const ano = dataOFX.substring(0, 4);
  const mes = dataOFX.substring(4, 6);
  const dia = dataOFX.substring(6, 8);
  
  return `${ano}-${mes}-${dia}`;
}

function converterDataCSV(dataCSV) {
  // Assume DD/MM/YYYY
  if (!dataCSV) return '';
  
  const partes = dataCSV.trim().split('/');
  if (partes.length !== 3) return dataCSV;
  
  const dia = partes[0].padStart(2, '0');
  const mes = partes[1].padStart(2, '0');
  const ano = partes[2];
  
  return `${ano}-${mes}-${dia}`;
}

// Conciliação automática
async function conciliarAutomatico(base44, workshop_id, banco) {
  // Busca transações pendentes
  const transacoesPendentes = await base44.entities.BankTransaction.filter({
    workshop_id,
    banco,
    status_conciliacao: 'pendente'
  });

  // Busca liquidações não conciliadas
  const liquidacoesPendentes = await base44.entities.LiquidacaoFinanceira.filter({
    workshop_id,
    conciliado: false
  });

  const conciliadas = 0;
  const divergentes = 0;

  for (const transacao of transacoesPendentes) {
    // Tenta encontrar match
    const match = liquidacoesPendentes.find(l => {
      // Critério 1: Valor igual (±0.01)
      const valorMatch = Math.abs(l.valor_liquidacao - transacao.valor) < 0.01;
      
      // Critério 2: Data igual (±2 dias)
      const dataTransacao = new Date(transacao.data_operacao);
      const dataLiquidação = new Date(l.data_liquidacao);
      const diffDias = Math.abs((dataTransacao - dataLiquidação) / (1000 * 60 * 60 * 24));
      const dataMatch = diffDias <= 2;
      
      // Critério 3: Descrição similar (opcional)
      const descricaoMatch = l.observacoes?.toLowerCase().includes(transacao.descricao.toLowerCase().substring(0, 10)) ||
                            transacao.descricao.toLowerCase().includes(l.forma_pagamento?.toLowerCase()) ||
                            transacao.metadados?.id_pix === l.metadados?.id_pix;
      
      return valorMatch && dataMatch;
    });

    if (match) {
      // Concilia!
      await base44.entities.BankTransaction.update(transacao.id, {
        liquidacao_financeira_id: match.id,
        status_conciliacao: 'conciliado',
        data_conciliacao: new Date().toISOString(),
        conciliado_por: 'sistema_auto'
      });

      await base44.entities.LiquidacaoFinanceira.update(match.id, {
        conciliado: true,
        data_conciliacao: new Date().toISOString()
      });

      conciliadas++;
    } else {
      // Sem match → divergente
      await base44.entities.BankTransaction.update(transacao.id, {
        status_conciliacao: 'divergente',
        divergencia_tipo: 'sem_match_sistema'
      });

      divergentes++;
    }
  }

  const pendentes = transacoesPendentes.length - conciliadas - divergentes;

  return {
    conciliadas,
    pendentes,
    divergentes,
    total: transacoesPendentes.length
  };
}
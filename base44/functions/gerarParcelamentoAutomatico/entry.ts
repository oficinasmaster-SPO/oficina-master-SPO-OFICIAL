import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      dre_lancamento_id,
      cliente_id,
      cliente_nome,
      valor_total,
      entrada,
      quantidade_parcelas,
      data_primeiro_vencimento,
      forma_pagamento,
      tipo_documento,
      observacoes
    } = await req.json();

    // Validações
    if (!valor_total || valor_total <= 0) {
      return Response.json({ error: 'Valor total inválido' }, { status: 400 });
    }

    if (!quantidade_parcelas || quantidade_parcelas < 1) {
      return Response.json({ error: 'Quantidade de parcelas inválida' }, { status: 400 });
    }

    if (!data_primeiro_vencimento) {
      return Response.json({ error: 'Data do primeiro vencimento obrigatória' }, { status: 400 });
    }

    // Calcula valores
    const valor_entrada = entrada || 0;
    const valor_parcelado = valor_total - valor_entrada;
    const valor_parcela = valor_parcelado > 0 ? valor_parcelado / quantidade_parcelas : 0;

    const contasReceber = [];
    const workshop = await getWorkshopId(cliente_id, base44);

    // 1. Cria entrada (se houver)
    if (valor_entrada > 0) {
      contasReceber.push({
        workshop_id: workshop,
        dre_lancamento_id: dre_lancamento_id || null,
        cliente_id: cliente_id,
        cliente_nome: cliente_nome,
        valor_original: valor_entrada,
        valor_aberto: valor_entrada,
        valor_pago: 0,
        status: 'aberto',
        data_vencimento: data_primeiro_vencimento,
        data_emissao: new Date().toISOString().slice(0, 10),
        numero_documento: gerarNumeroDocumento(),
        tipo_documento: tipo_documento || 'recibo',
        forma_pagamento: forma_pagamento || 'pix',
        parcela_numero: 1,
        parcela_total: valor_parcelado > 0 ? quantidade_parcelas + 1 : 1,
        observacoes: observacoes || ''
      });
    }

    // 2. Cria parcelas (se houver)
    if (valor_parcelado > 0) {
      for (let i = 0; i < quantidade_parcelas; i++) {
        const dataVencimento = adicionarMeses(new Date(data_primeiro_vencimento), i + 1);
        
        contasReceber.push({
          workshop_id: workshop,
          dre_lancamento_id: dre_lancamento_id || null,
          cliente_id: cliente_id,
          cliente_nome: cliente_nome,
          valor_original: valor_parcela,
          valor_aberto: valor_parcela,
          valor_pago: 0,
          status: 'aberto',
          data_vencimento: dataVencimento.toISOString().slice(0, 10),
          data_emissao: new Date().toISOString().slice(0, 10),
          numero_documento: gerarNumeroDocumento(),
          tipo_documento: tipo_documento || 'duplicata',
          forma_pagamento: forma_pagamento || 'boleto',
          parcela_numero: (valor_entrada > 0 ? i + 2 : i + 1),
          parcela_total: valor_entrada > 0 ? quantidade_parcelas + 1 : quantidade_parcelas,
          observacoes: observacoes || ''
        });
      }
    }

    // 3. Cria todas as contas em bulk
    const contasCriadas = await base44.entities.ContaReceber.bulkCreate(contasReceber);

    return Response.json({
      success: true,
      total_contas: contasCriadas.length,
      valor_entrada: valor_entrada,
      valor_parcelado: valor_parcelado,
      valor_parcela: valor_parcela,
      quantidade_parcelas: quantidade_parcelas,
      contas_ids: contasCriadas.map(c => c.id)
    });

  } catch (error) {
    console.error('Erro ao gerar parcelamento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helpers
async function getWorkshopId(cliente_id, base44) {
  // Tenta buscar workshop do cliente
  try {
    const cliente = await base44.entities.Client.get(cliente_id);
    if (cliente && cliente.workshop_id) {
      return cliente.workshop_id;
    }
  } catch {
    // Cliente não existe ou não tem workshop
  }

  // Fallback: usa workshop do usuário atual
  const user = await base44.auth.me();
  return user.data?.workshop_id || null;
}

function gerarNumeroDocumento() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `DOC-${timestamp}-${random}`;
}

function adicionarMeses(data, meses) {
  const resultado = new Date(data);
  resultado.setMonth(resultado.getMonth() + meses);
  return resultado;
}
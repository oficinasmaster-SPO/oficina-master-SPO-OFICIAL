import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Dados do trigger da automação
    const { event, data } = await req.json();
    const dre = data;
    
    if (!dre || !dre.id) {
      return Response.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Verifica se já existe conta vinculada (evita duplicação)
    const existingReceber = await base44.entities.ContaReceber.filter({
      dre_lancamento_id: dre.id
    });
    
    const existingPagar = await base44.entities.ContaPagar.filter({
      dre_lancamento_id: dre.id
    });
    
    if ((existingReceber && existingReceber.length > 0) || 
        (existingPagar && existingPagar.length > 0)) {
      return Response.json({ 
        message: 'Conta já existe para este lançamento DRE',
        skipped: true 
      });
    }

    // 🟢 RECEITA → CONTA A RECEBER
    if (dre.tipo === 'receita') {
      await base44.entities.ContaReceber.create({
        workshop_id: dre.workshop_id,
        dre_lancamento_id: dre.id,
        cliente_id: null, // Opcional - usuário preenche depois
        cliente_nome: dre.descricao || dre.subcategoria || dre.categoria || 'Cliente',
        contato_telefone: '',
        contato_email: '',
        valor_original: dre.valor,
        valor_aberto: dre.valor,
        valor_pago: 0,
        status: 'aberto',
        data_vencimento: dre.data_vencimento ? String(dre.data_vencimento).split('T')[0] : new Date().toISOString().split('T')[0],
        data_emissao: new Date().toISOString().split('T')[0],
        numero_documento: `DRE-${dre.id}`,
        tipo_documento: 'nota_fiscal',
        forma_pagamento: 'pix',
        observacoes: `Gerado do DRE: ${dre.categoria} - ${dre.subcategoria || ''}`
      });
      
      return Response.json({ success: true, tipo: 'receber' });
      
    } 
    // 🔴 DESPESA → CONTA A PAGAR
    else if (dre.tipo === 'despesa') {
      await base44.entities.ContaPagar.create({
        workshop_id: dre.workshop_id,
        dre_lancamento_id: dre.id,
        fornecedor_id: null,
        fornecedor_nome: dre.descricao || dre.categoria || 'Fornecedor',
        contato_telefone: '',
        contato_email: '',
        valor_original: dre.valor,
        valor_aberto: dre.valor,
        valor_pago: 0,
        status: 'aberto',
        data_vencimento: dre.data_vencimento ? String(dre.data_vencimento).split('T')[0] : new Date().toISOString().split('T')[0],
        data_emissao: new Date().toISOString().split('T')[0],
        numero_documento: `DRE-${dre.id}`,
        tipo_documento: 'boleto',
        categoria: dre.categoria,
        forma_pagamento: 'pix',
        observacoes: `Gerado do DRE: ${dre.categoria} - ${dre.subcategoria || ''}`
      });
      
      return Response.json({ success: true, tipo: 'pagar' });
    }

    return Response.json({ message: 'Tipo não suportado', skipped: true });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Função temporária para auditar e remover tarefas "lixo" sem nome de cliente
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // default: apenas auditar, não deletar

    // Busca todas as tarefas não concluídas (inclui 'aberta' e 'a_fazer')
    const abertas = await base44.asServiceRole.entities.TarefaBacklog.filter(
      { status: 'aberta' }, 'created_date', 500
    );
    const aFazer = await base44.asServiceRole.entities.TarefaBacklog.filter(
      { status: 'a_fazer' }, 'created_date', 500
    );
    const todas = [...abertas, ...aFazer];

    // Filtra as que têm cliente_nome vazio/nulo OU com ID no título (padrão "Reagendar: A Definir - Cliente XXXX")
    const lixo = todas.filter(t => {
      const semNomeCliente = !t.cliente_nome || t.cliente_nome.trim() === '' || t.cliente_nome === 'A Definir';
      const tituloComId = /Cliente [a-f0-9]{24}/i.test(t.titulo || '');
      return semNomeCliente || tituloComId;
    });

    console.log(`📊 Total abertas: ${todas.length} | Lixo: ${lixo.length} | DryRun: ${dryRun}`);

    lixo.slice(0, 5).forEach(t => {
      console.log(`  - "${t.titulo}" | cliente_nome="${t.cliente_nome}" | id=${t.id}`);
    });

    if (dryRun) {
      return Response.json({
        dryRun: true,
        totalAbertas: todas.length,
        totalParaRemover: lixo.length,
        amostra: lixo.slice(0, 10).map(t => ({ id: t.id, titulo: t.titulo, cliente_nome: t.cliente_nome })),
        mensagem: `SIMULAÇÃO: ${lixo.length} tarefas seriam removidas. Envie dryRun=false para confirmar.`
      });
    }

    // Deletar em sequência com delay
    let removidos = 0;
    let erros = 0;
    for (const t of lixo) {
      try {
        await base44.asServiceRole.entities.TarefaBacklog.delete(t.id);
        removidos++;
        await new Promise(r => setTimeout(r, 150));
      } catch (e) {
        erros++;
        console.error(`Erro ao deletar ${t.id}:`, e.message);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return Response.json({
      dryRun: false,
      totalAbertas: todas.length,
      removidos,
      erros,
      mensagem: `${removidos} tarefas lixo removidas com sucesso.`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      workshop_id,
      mes_inicio,
      tipo,
      categoria,
      subcategoria,
      descricao,
      valor,
      entra_tcmp2,
      data_vencimento,
      frequencia,
      numero_parcelas,
      data_inicio,
      data_fim,
      data_competencia,
      data_documento,
      tipo_documento,
      numero_documento
    } = body;

    if (!frequencia || frequencia === 'unico') {
      return Response.json({ 
        error: 'Frequência inválida. Use criar lançamento normal para lançamentos únicos.' 
      }, { status: 400 });
    }

    // Gerar ID único para esta recorrência
    const recorrencia_id = crypto.randomUUID();

    // Calcular meses/semanas baseado na frequência
    const meses = calcularPeriodos(data_inicio, data_fim, numero_parcelas, frequencia);

    if (meses.length === 0) {
      return Response.json({ 
        error: 'Nenhum período válido calculado. Verifique as datas.' 
      }, { status: 400 });
    }

    // Criar lançamentos para cada período
    const lancamentosCriados = [];
    
    // Datas-base opcionais: sem vencimento/competência, os lançamentos ficam sem a data
    const dataVencimentoOriginal = data_vencimento ? new Date(data_vencimento) : null;
    const dataCompetenciaOriginal = data_competencia ? new Date(data_competencia) : null;

    for (let i = 0; i < meses.length; i++) {
      const mesRef = meses[i].mes;
      const parcelaAtual = i + 1;

      // Calcular data_vencimento para esta parcela (mesmo dia, avançando 1 período por parcela)
      // Exemplo: se era 19/05/2026 e frequência=mensal, a próxima é 19/06/2026, depois 19/07, etc
      let dataVencimentoParcela;
      if (dataVencimentoOriginal) {
        const dataParcela = new Date(dataVencimentoOriginal);
        dataParcela.setMonth(dataParcela.getMonth() + i);
        dataVencimentoParcela = dataParcela.toISOString().split('T')[0];
      }

      // data_competencia também avança 1 período por parcela (fato gerador de cada ocorrência)
      let dataCompetenciaParcela;
      if (dataCompetenciaOriginal) {
        const dataComp = new Date(dataCompetenciaOriginal);
        dataComp.setMonth(dataComp.getMonth() + i);
        dataCompetenciaParcela = dataComp.toISOString().split('T')[0];
      }

      const lancamento = await base44.entities.DRELancamento.create({
        workshop_id,
        mes: mesRef,
        tipo,
        categoria,
        subcategoria,
        descricao,
        valor,
        entra_tcmp2: entra_tcmp2 ?? true,
        ...(dataVencimentoParcela && { data_vencimento: dataVencimentoParcela }),
        ...(dataCompetenciaParcela && { data_competencia: dataCompetenciaParcela }),
        ...(data_documento && { data_documento }),
        ...(tipo_documento && { tipo_documento }),
        ...(numero_documento && { numero_documento }),
        frequencia,
        recorrencia_id,
        data_inicio,
        data_fim,
        numero_parcelas: meses.length,
        parcela_atual: parcelaAtual
      });

      lancamentosCriados.push({
        id: lancamento.id,
        mes: mesRef,
        parcela: parcelaAtual
      });
    }

    return Response.json({
      success: true,
      recorrencia_id,
      total_criado: lancamentosCriados.length,
      lancamentos: lancamentosCriados,
      mensagem: `${lancamentosCriados.length} lançamentos criados com sucesso!`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});

// Função auxiliar para calcular períodos
function calcularPeriodos(dataInicio, dataFim, numeroParcelas, frequencia) {
  const periodos = [];
  const inicio = new Date(dataInicio);
  const fim = dataFim ? new Date(dataFim) : null;
  
  let current = new Date(inicio);
  let count = 0;

  while (true) {
    const mesRef = formatarMes(current);
    
    // Verifica se atingiu número máximo de parcelas
    if (numeroParcelas && count >= numeroParcelas) {
      break;
    }

    // Verifica se passou da data fim
    if (fim && current > fim) {
      break;
    }

    periodos.push({
      mes: mesRef,
      data: new Date(current)
    });

    count++;

    // Avançar para próximo período baseado na frequência
    switch (frequencia) {
      case 'mensal':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'quinzenal':
        current.setDate(current.getDate() + 15);
        break;
      case 'semanal':
        current.setDate(current.getDate() + 7);
        break;
      case 'anual':
        current.setFullYear(current.getFullYear() + 1);
        break;
      default:
        current.setMonth(current.getMonth() + 1);
    }

    // Segurança: máximo de 60 períodos
    if (count > 60) {
      break;
    }
  }

  return periodos;
}

function formatarMes(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
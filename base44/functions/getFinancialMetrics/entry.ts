import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { startDate, endDate } = await req.json();

    const contracts = await base44.asServiceRole.entities.Contract.list();

    const filteredContracts = contracts.filter(contract => {
      const createdDate = new Date(contract.created_date);
      return createdDate >= new Date(startDate) && createdDate <= new Date(endDate);
    });

    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    filteredContracts.forEach(contract => {
      const value = contract.contract_value || 0;
      
      if (contract.payment_confirmed) {
        totalPaid += value;
      } else {
        const dueDate = contract.payment_due_date ? new Date(contract.payment_due_date) : null;
        const isOverdue = dueDate && dueDate < new Date();
        
        if (isOverdue) {
          totalOverdue += value;
        } else {
          totalPending += value;
        }
      }
    });

    const conversionRate = filteredContracts.length > 0
      ? (filteredContracts.filter(c => c.payment_confirmed).length / filteredContracts.length) * 100
      : 0;

    const planPerformance = {};
    const consultorPerformance = {};

    filteredContracts.forEach(contract => {
      const plan = contract.plan_type || 'Sem plano';
      const consultor = contract.consultor_nome || 'Sem consultor';

      if (!planPerformance[plan]) {
        planPerformance[plan] = { plan, revenue: 0, contracts: 0 };
      }
      planPerformance[plan].revenue += contract.contract_value || 0;
      planPerformance[plan].contracts += 1;

      if (!consultorPerformance[consultor]) {
        consultorPerformance[consultor] = { consultor, revenue: 0, contracts: 0 };
      }
      consultorPerformance[consultor].revenue += contract.contract_value || 0;
      consultorPerformance[consultor].contracts += 1;
    });

    return Response.json({
      totalPaid,
      totalPending,
      totalOverdue,
      conversionRate,
      planPerformance: Object.values(planPerformance),
      consultorPerformance: Object.values(consultorPerformance),
      contracts: filteredContracts
    });

  } catch (error) {
    console.error('Error getting financial metrics:', error);
    return Response.json({ 
      error: error.message || 'Erro ao buscar métricas'
    }, { status: 500 });
  }
});
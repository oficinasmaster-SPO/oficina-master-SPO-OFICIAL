import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_AREAS = [
  // ÁREAS GERAIS
  { name: 'Comercial & Vendas', category: 'geral', icon: 'ShoppingCart', color: '#3B82F6', order: 1 },
  { name: 'Marketing', category: 'geral', icon: 'Megaphone', color: '#8B5CF6', order: 2 },
  { name: 'Financeiro', category: 'geral', icon: 'DollarSign', color: '#10B981', order: 3 },
  { name: 'Administrativo', category: 'geral', icon: 'FileText', color: '#6B7280', order: 4 },
  { name: 'Recursos Humanos (RH)', category: 'geral', icon: 'Users', color: '#F59E0B', order: 5 },
  { name: 'Gerencial / Estratégico', category: 'geral', icon: 'TrendingUp', color: '#EF4444', order: 6 },
  { name: 'Operação / Pátio', category: 'geral', icon: 'Package', color: '#14B8A6', order: 7 },
  { name: 'Qualidade / Garantia / Segurança', category: 'geral', icon: 'Shield', color: '#EC4899', order: 8 },
  { name: 'Logística & Fornecedores', category: 'geral', icon: 'Truck', color: '#06B6D4', order: 9 },
  
  // ÁREAS TÉCNICAS
  { name: 'Mecânica Geral', category: 'tecnica', icon: 'Wrench', color: '#64748B', order: 10 },
  { name: 'Suspensão, Freios & Direção', category: 'tecnica', icon: 'Settings', color: '#7C3AED', order: 11 },
  { name: 'Injeção Eletrônica (Flex / Diesel)', category: 'tecnica', icon: 'Cpu', color: '#DC2626', order: 12 },
  { name: 'Elétrica & Eletrônica Automotiva', category: 'tecnica', icon: 'Zap', color: '#FBBF24', order: 13 },
  { name: 'Transmissão & Câmbio (Manual / Automático / CVT)', category: 'tecnica', icon: 'Cog', color: '#9333EA', order: 14 },
  { name: 'Ar-condicionado & Climatização', category: 'tecnica', icon: 'Wind', color: '#0EA5E9', order: 15 },
  { name: 'Diagnóstico Avançado', category: 'tecnica', icon: 'Search', color: '#F97316', order: 16 },
  { name: 'Módulos, Programação & Codificação', category: 'tecnica', icon: 'Code', color: '#8B5CF6', order: 17 },
  { name: 'Funilaria & Pintura', category: 'tecnica', icon: 'PaintBucket', color: '#EF4444', order: 18 },
  { name: 'Retífica de Motores', category: 'tecnica', icon: 'Cog', color: '#059669', order: 19 },
  { name: 'Estética Automotiva', category: 'tecnica', icon: 'Sparkles', color: '#EC4899', order: 20 },
  { name: 'Linha Diesel / Pesada (Caminhão, Ônibus, Máquinas)', category: 'tecnica', icon: 'Truck', color: '#D97706', order: 21 },
  { name: 'Veículos Híbridos & Elétricos', category: 'tecnica', icon: 'Battery', color: '#10B981', order: 22 }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado: apenas admins' }, { status: 403 });
    }

    const existingAreas = await base44.asServiceRole.entities.ProcessArea.filter({ is_default: true });
    
    if (existingAreas && existingAreas.length > 0) {
      return Response.json({ 
        success: true,
        message: 'Áreas padrão já foram inicializadas',
        count: existingAreas.length
      });
    }

    const createdAreas = [];
    for (const area of DEFAULT_AREAS) {
      const created = await base44.asServiceRole.entities.ProcessArea.create({
        ...area,
        is_default: true,
        workshop_id: null
      });
      createdAreas.push(created);
    }

    return Response.json({ 
      success: true,
      message: `${createdAreas.length} áreas padrão criadas com sucesso`,
      areas: createdAreas
    });

  } catch (error) {
    console.error('Erro ao inicializar áreas:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
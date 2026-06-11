import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// R3 FIX (Opção B): Limpeza periódica de workshops rascunho abandonados.
//
// Detecta workshops com status='rascunho' criados há mais de 48h e toma 3 ações:
//
// CASO 1: Tem Employee + tem nome → Promove para ativo
//   Onboarding estava incompleto mas não abandonado — owner voltará e encontrará tudo pronto.
//
// CASO 2: Sem Employee + owner tem outro workshop ativo → Inativa
//   Duplicata de onboarding abandonado — limpar para não confundir.
//
// CASO 3: Sem Employee + owner sem workshop ativo → Cria Employee placeholder (Sócio)
//   Owner ficou sem Employee — recuperar acesso para quando voltar.
//
// GET ?dry_run=true → mostra o que faria sem alterar nada
// POST {}           → executa as ações

const SOCIO_PROFILE_ID = '6a272f8ea3fa8dd02ca7350e'; // Sócio - Acesso Total
const DEFAULT_CONSULTING_FIRM_ID = '69bab264d7c3fe5d367c3959';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    // Admin-only
    try {
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }
    } catch (_) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const dryRun = req.method === 'GET' || url.searchParams.get('dry_run') === 'true';

    console.log(`🔍 cleanupAbandonedWorkshops — modo: ${dryRun ? 'DRY RUN' : 'EXECUÇÃO'}`);

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Buscar todos os workshops rascunho
    const rascunhos = await base44.asServiceRole.entities.Workshop.filter({ status: 'rascunho' });

    if (!rascunhos || rascunhos.length === 0) {
        return Response.json({ success: true, message: 'Nenhum workshop rascunho encontrado.', processed: 0 });
    }

    // Filtrar apenas os criados há mais de 48h
    const antigos = rascunhos.filter(w => w.created_date && w.created_date < cutoff);
    console.log(`📋 Workshops rascunho com >48h: ${antigos.length} de ${rascunhos.length} total`);

    const results = {
        dry_run: dryRun,
        total_rascunhos: rascunhos.length,
        total_antigos: antigos.length,
        caso1_promovidos: [],
        caso2_inativados: [],
        caso3_employee_criado: [],
        erros: []
    };

    for (const workshop of antigos) {
        try {
            const ownerId = workshop.owner_id;
            if (!ownerId) {
                results.erros.push({ workshop_id: workshop.id, reason: 'sem owner_id' });
                continue;
            }

            // Buscar employees deste workshop
            const employees = await base44.asServiceRole.entities.Employee.filter({
                workshop_id: workshop.id
            });
            const hasEmployee = employees && employees.length > 0;
            const hasName = !!(workshop.name && workshop.name.trim() !== '' && workshop.name !== 'A Definir');

            if (hasEmployee && hasName) {
                // CASO 1: Tem Employee + tem nome → Promover para ativo
                console.log(`✅ [CASO 1] Workshop ${workshop.id} tem employee e nome — promovendo para ativo`);
                results.caso1_promovidos.push({
                    workshop_id: workshop.id,
                    workshop_name: workshop.name,
                    owner_id: ownerId,
                    employee_count: employees.length
                });
                if (!dryRun) {
                    await base44.asServiceRole.entities.Workshop.update(workshop.id, { status: 'ativo' });
                }
            } else if (!hasEmployee) {
                // Verificar se owner tem outro workshop ativo
                const outrosAtivos = await base44.asServiceRole.entities.Workshop.filter({
                    owner_id: ownerId,
                    status: 'ativo'
                });
                const hasOutroAtivo = outrosAtivos && outrosAtivos.length > 0;

                if (hasOutroAtivo) {
                    // CASO 2: Sem Employee + owner tem workshop ativo → Inativar (duplicata)
                    console.log(`🗑️ [CASO 2] Workshop ${workshop.id} é duplicata abandonada — inativando`);
                    results.caso2_inativados.push({
                        workshop_id: workshop.id,
                        workshop_name: workshop.name || '(sem nome)',
                        owner_id: ownerId,
                        workshop_ativo_existente: outrosAtivos[0].id
                    });
                    if (!dryRun) {
                        await base44.asServiceRole.entities.Workshop.update(workshop.id, { status: 'inativo' });
                    }
                } else {
                    // CASO 3: Sem Employee + owner sem workshop ativo → Criar Employee placeholder
                    console.log(`🏗️ [CASO 3] Workshop ${workshop.id} sem Employee e sem ativo — criando Employee placeholder`);

                    // Buscar dados do owner
                    let ownerName = 'Proprietário';
                    let ownerEmail = '';
                    let consultingFirmId = workshop.consulting_firm_id || DEFAULT_CONSULTING_FIRM_ID;
                    try {
                        const ownerUser = await base44.asServiceRole.entities.User.get(ownerId);
                        if (ownerUser) {
                            ownerName = ownerUser.full_name || ownerUser.email?.split('@')[0] || 'Proprietário';
                            ownerEmail = ownerUser.email || '';
                            consultingFirmId = ownerUser.consulting_firm_id || consultingFirmId;
                        }
                    } catch (_) {}

                    results.caso3_employee_criado.push({
                        workshop_id: workshop.id,
                        workshop_name: workshop.name || '(sem nome)',
                        owner_id: ownerId,
                        owner_email: ownerEmail
                    });

                    if (!dryRun) {
                        await base44.asServiceRole.entities.Employee.create({
                            workshop_id: workshop.id,
                            consulting_firm_id: consultingFirmId,
                            user_id: ownerId,
                            full_name: ownerName,
                            email: ownerEmail,
                            position: 'Sócio/Proprietário',
                            job_role: 'socio',
                            area: 'gerencia',
                            tipo_vinculo: 'cliente',
                            user_type: 'external',
                            is_partner: true,
                            is_internal: false,
                            status: 'ativo',
                            user_status: 'ativo',
                            profile_id: SOCIO_PROFILE_ID,
                            hire_date: new Date().toISOString().split('T')[0]
                        });
                        // Não promover para ativo — onboarding ainda pode estar incompleto
                        // Owner verá workshop rascunho e poderá continuar cadastro
                    }
                }
            }
            // hasEmployee mas sem nome: ignorar — owner ainda pode estar preenchendo
        } catch (err) {
            console.error(`❌ Erro ao processar workshop ${workshop.id}:`, err.message);
            results.erros.push({ workshop_id: workshop.id, reason: err.message });
        }
    }

    const summary = {
        caso1_promovidos: results.caso1_promovidos.length,
        caso2_inativados: results.caso2_inativados.length,
        caso3_employee_criado: results.caso3_employee_criado.length,
        erros: results.erros.length
    };

    console.log(`📊 Resumo: ${JSON.stringify(summary)}`);

    return Response.json({
        success: true,
        dry_run: dryRun,
        summary,
        details: results
    });
});
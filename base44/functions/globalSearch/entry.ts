import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Helper functions for formatting results
function getTitle(type, item) {
    if (type === 'Employee') return item.full_name;
    if (type === 'Task') return item.title;
    if (type === 'Client') return item.full_name;
    if (type === 'EmployeeFeedback') return item.type ? item.type.replace('_', ' ').toUpperCase() : 'Feedback';
    if (type === 'Goal') return `Meta: ${item.area} (${item.periodo})`;
    if (type === 'ProcessDocument') return item.process_name;
    if (type === 'CompanyDocument') return item.title;
    if (type === 'InstructionDocument') return `IT: ${item.it_code || item.title}`;
    if (type === 'TrainingCourse') return item.title;
    if (type === 'Challenge') return item.title;
    if (type === 'Workshop') return item.name;
    return 'Item';
}

function getSubtitle(type, item) {
    if (type === 'Employee') return item.position;
    if (type === 'Task') return item.status || 'Pendente';
    if (type === 'Client') return item.email || item.phone;
    if (type === 'EmployeeFeedback') return item.content ? item.content.substring(0, 60) + '...' : 'Conteúdo do feedback';
    if (type === 'Goal') return `${item.percentual_atingido || 0}% atingido`;
    if (type === 'ProcessDocument') return `${item.process_area || ''} - ${item.status || ''}`;
    if (type === 'CompanyDocument') return `${item.category || ''} - ${item.document_type || ''}`;
    if (type === 'InstructionDocument') return item.subprocess_area || item.process_area || '';
    if (type === 'TrainingCourse') return `${item.category || ''} - ${item.difficulty_level || ''}`;
    if (type === 'Challenge') return `${item.target_type} - ${item.type}`;
    if (type === 'Workshop') return item.city || item.segment;
    return '';
}

function getUrl(type, item) {
    if (type === 'Employee') return `DetalhesColaborador?id=${item.id}`;
    if (type === 'Task') return `Tarefas?search=${item.id}`;
    if (type === 'Client') return `Clientes?id=${item.id}`;
    if (type === 'EmployeeFeedback') return `Feedbacks?id=${item.id}`;
    if (type === 'Goal') return `GestaoMetas`;
    if (type === 'ProcessDocument') return `VisualizarProcesso?id=${item.id}`;
    if (type === 'CompanyDocument') return `RepositorioDocumentos?doc=${item.id}`;
    if (type === 'InstructionDocument') return `MeusProcessos?view=it&id=${item.id}`;
    if (type === 'TrainingCourse') return `AssistirCurso?course_id=${item.id}`;
    if (type === 'Challenge') return `Gamificacao?challenge=${item.id}`;
    if (type === 'Workshop') return `GestaoOficina`;
    return '#';
}

function getIcon(type) {
    if (type === 'Employee') return 'User';
    if (type === 'Task') return 'CheckSquare';
    if (type === 'Client') return 'Briefcase';
    if (type === 'EmployeeFeedback') return 'MessageSquare';
    if (type === 'Goal') return 'Target';
    if (type === 'ProcessDocument') return 'FileText';
    if (type === 'CompanyDocument') return 'FileCheck';
    if (type === 'InstructionDocument') return 'ClipboardList';
    if (type === 'TrainingCourse') return 'GraduationCap';
    if (type === 'Challenge') return 'Trophy';
    if (type === 'Workshop') return 'Building';
    return 'Search';
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let user;
        try {
            user = await base44.auth.me();
        } catch (e) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!user || !user.data || !user.data.workshop_id) {
            return Response.json({ error: 'Unauthorized or missing workshop_id' }, { status: 401 });
        }

        const secureWorkshopId = user.data.workshop_id;
        
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error("❌ Erro ao parsear body:", e);
            return Response.json({ results: [], error: "Invalid JSON" });
        }

        const { query, skip = 0, limit = 50, entity_types = [] } = body;
        console.log("🔍 Busca iniciada:", { query, secureWorkshopId, skip, limit, entity_types });

        if (!query || typeof query !== 'string' || query.length < 2) {
             console.log("⚠️ Query muito curta");
             return Response.json({ results: [], total: 0, hasMore: false });
        }

        const searchTerm = query.toLowerCase();
        const searchTerms = searchTerm.split(' ').filter(t => t.length > 1);
        console.log("🔎 Termos de busca:", searchTerms);

        const entitiesToSearch = [
            { name: 'Employee', fields: ['full_name', 'position', 'email'] },
            { name: 'Task', fields: ['title', 'description', 'os_number'] },
            { name: 'Client', fields: ['full_name', 'email', 'phone'] },
            { name: 'EmployeeFeedback', fields: ['content'] },
            { name: 'Goal', fields: ['area', 'observacoes'] },
            { name: 'ProcessDocument', fields: ['process_name', 'process_code', 'process_area', 'keywords', 'objective'] },
            { name: 'CompanyDocument', fields: ['title', 'document_id', 'category', 'document_type', 'subprocess_area'] },
            { name: 'InstructionDocument', fields: ['title', 'it_code', 'process_area', 'subprocess_area', 'keywords'] },
            { name: 'TrainingCourse', fields: ['title', 'description', 'category', 'short_description'] },
            { name: 'Challenge', fields: ['title', 'description', 'target_area'] },
            { name: 'Workshop', fields: ['name', 'segment', 'city', 'razao_social'] }
        ];

        const searchPromises = entitiesToSearch
            .filter(entity => entity_types.length === 0 || entity_types.includes(entity.name))
            .map(async (entity) => {
             try {
                 console.log(`📋 Buscando em ${entity.name} para o tenant ${secureWorkshopId}...`);
                 let items = [];
                 
                 try {
                     if (entity.name === 'Workshop') {
                         // Para o Workshop em si, a consulta busca o ID igual ao workshop_id
                         items = await base44.asServiceRole.entities.Workshop.filter({ id: secureWorkshopId }, '-updated_date', 500);
                     } else {
                         // Para todas as outras entidades vinculadas, aplica o filtro direto no banco
                         items = await base44.asServiceRole.entities[entity.name].filter({ workshop_id: secureWorkshopId }, '-updated_date', 500);
                     }
                     console.log(`✅ ${entity.name}: ${items?.length || 0} itens retornados do BD para o tenant`);
                 } catch (listError) {
                     console.error(`❌ Error listing ${entity.name}:`, listError.message);
                     return [];
                 }

                 if (!Array.isArray(items)) {
                     return [];
                 }

                 // Busca in-memory APENAS pelos termos (Isolamento de tenant já garantido via banco)
                 const matches = items.filter(item => {
                     // Se tiver múltiplos termos, todos devem estar presentes
                     return searchTerms.every(term => 
                         entity.fields.some(field => {
                             const val = item[field];
                             return val && String(val).toLowerCase().includes(term);
                         })
                     );
                 });
                 
                 console.log(`🎯 ${entity.name}: ${matches.length} matches após filtro textual`);

                 return matches.map(item => ({
                     id: item.id,
                     type: entity.name,
                     title: getTitle(entity.name, item),
                     subtitle: getSubtitle(entity.name, item),
                     url: getUrl(entity.name, item),
                     icon: getIcon(entity.name)
                 }));

             } catch (e) {
                 console.error(`Error searching ${entity.name}:`, e);
                 return [];
             }
        });

        const resultsArrays = await Promise.all(searchPromises);
        const flatResults = resultsArrays.flat();
        
        console.log(`📊 Total de resultados: ${flatResults.length}`);

        flatResults.sort((a, b) => a.title.localeCompare(b.title));
        
        const total = flatResults.length;
        const paginatedResults = flatResults.slice(skip, skip + limit);
        const hasMore = (skip + limit) < total;
        
        console.log(`✨ Retornando ${paginatedResults.length} de ${total} resultados (skip: ${skip}, limit: ${limit}, hasMore: ${hasMore})`);

        return Response.json({ 
            results: paginatedResults, 
            total,
            hasMore,
            skip,
            limit
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
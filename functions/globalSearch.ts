import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper functions for formatting results
function getTitle(type, item) {
    if (type === 'Employee') return item.full_name;
    if (type === 'Task') return item.title;
    if (type === 'Client') return item.full_name;
    if (type === 'EmployeeFeedback') return item.type ? item.type.replace('_', ' ').toUpperCase() : 'Feedback';
    if (type === 'Goal') return `Meta: ${item.area} (${item.periodo})`;
    return 'Item';
}

function getSubtitle(type, item) {
    if (type === 'Employee') return item.position;
    if (type === 'Task') return item.status || 'Pendente';
    if (type === 'Client') return item.email || item.phone;
    if (type === 'EmployeeFeedback') return item.content ? item.content.substring(0, 60) + '...' : 'Conteúdo do feedback';
    if (type === 'Goal') return `${item.percentual_atingido || 0}% atingido`;
    return '';
}

function getUrl(type, item) {
    if (type === 'Employee') return `DetalhesColaborador?id=${item.id}`;
    if (type === 'Task') return `Tarefas?search=${item.id}`; // Adaptação para abrir tarefa
    if (type === 'Client') return `Clientes?id=${item.id}`;
    if (type === 'EmployeeFeedback') return `Feedbacks?id=${item.id}`;
    if (type === 'Goal') return `GestaoMetas`;
    return '#';
}

function getIcon(type) {
    if (type === 'Employee') return 'User';
    if (type === 'Task') return 'CheckSquare';
    if (type === 'Client') return 'Briefcase';
    if (type === 'EmployeeFeedback') return 'MessageSquare';
    if (type === 'Goal') return 'Target';
    return 'Search';
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Handle CORS if needed or parse body
        let body;
        try {
            body = await req.json();
        } catch {
            return Response.json({ results: [] });
        }

        const { query, workshop_id } = body;

        if (!query || typeof query !== 'string' || query.length < 2) {
             return Response.json({ results: [] });
        }

        const searchTerm = query.toLowerCase();

        // Entities to search in
        // Note: For large datasets, this in-memory filtering of 'list' results 
        // is a temporary optimization. Ideal solution would be database full-text search.
        const entitiesToSearch = [
            { name: 'Employee', fields: ['full_name', 'position', 'email'] },
            { name: 'Task', fields: ['title', 'description', 'os_number'] },
            { name: 'Client', fields: ['full_name', 'email', 'phone'] },
            { name: 'EmployeeFeedback', fields: ['content'] },
            { name: 'Goal', fields: ['area', 'observacoes'] }
        ];

        const searchPromises = entitiesToSearch.map(async (entity) => {
             try {
                 // Fetch latest items (limit 200 per entity to maintain performance)
                 // If workshop_id provided, we could try to filter by it if the entity supports it
                 // Most entities in this app seem to have workshop_id
                 
                 let items = [];
                 if (workshop_id) {
                     // Try filtering by workshop_id if possible/known field
                     // Since SDK filter might throw if field doesn't exist, we'll try-catch or assume schema
                     // For safety in this generic function, we'll fetch list and filter in memory if filter fails, 
                     // OR rely on the fact most key entities have workshop_id.
                     // Assuming filter works:
                     try {
                        items = await base44.entities[entity.name].filter({ workshop_id }, '-updated_date', 200);
                     } catch {
                        // Fallback to listing if filtering by workshop_id fails (e.g. entity doesn't have it)
                        items = await base44.entities[entity.name].list('-updated_date', 200);
                     }
                 } else {
                     items = await base44.entities[entity.name].list('-updated_date', 200);
                 }

                 if (!Array.isArray(items)) return [];

                 // In-memory fuzzy search
                 const matches = items.filter(item => {
                     // Check workshop_id just in case fallback was used
                     if (workshop_id && item.workshop_id && item.workshop_id !== workshop_id) return false;

                     return entity.fields.some(field => {
                         const val = item[field];
                         return val && String(val).toLowerCase().includes(searchTerm);
                     });
                 });

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

        // Sort by relevance? Or just simple sort by type
        // Let's sort alphabetically by title for now
        flatResults.sort((a, b) => a.title.localeCompare(b.title));

        return Response.json({ results: flatResults.slice(0, 50) }); // Return top 50

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
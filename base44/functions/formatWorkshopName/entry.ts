import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function toTitleCase(str) {
  if (!str) return '';
  const lowercaseWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'a', 'o', 'as', 'os'];
  
  // Transforma tudo em minúsculo e separa as palavras
  const words = str.trim().toLowerCase().split(/\s+/);
  
  return words.map((word, index) => {
    // Se for uma palavra de ligação e não for a primeira palavra, mantem em minúsculo
    if (index > 0 && lowercaseWords.includes(word)) {
      return word;
    }
    // Caso contrário, capitaliza a primeira letra
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const base44 = createClientFromRequest(req);
        
        // Pega os dados do webhook da automação (evento e dados da entidade)
        const { event, data } = body;
        
        if (!data || !data.name || !event || !event.entity_id) {
             return Response.json({ success: true, message: 'Dados inválidos ou sem nome' });
        }
        
        const formattedName = toTitleCase(data.name.toString());
        
        // Se o nome formatado for diferente do que está no banco, nós o atualizamos
        if (formattedName !== data.name) {
            await base44.asServiceRole.entities.Workshop.update(event.entity_id, {
                name: formattedName
            });
            return Response.json({ success: true, updated: true, old_name: data.name, new_name: formattedName });
        }
        
        return Response.json({ success: true, updated: false, message: 'Já estava formatado corretamente' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
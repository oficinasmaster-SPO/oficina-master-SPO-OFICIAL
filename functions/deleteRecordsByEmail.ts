import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email, entity_name } = await req.json();

    if (!email || !entity_name) {
      return Response.json({ error: 'Email and entity_name are required' }, { status: 400 });
    }

    // Buscar todos os registros criados por esse email
    const records = await base44.asServiceRole.entities[entity_name].filter({
      created_by: email
    });

    console.log(`Found ${records.length} records for ${email} in ${entity_name}`);

    // Deletar todos os registros
    const deletePromises = records.map(record => 
      base44.asServiceRole.entities[entity_name].delete(record.id)
    );

    await Promise.all(deletePromises);

    return Response.json({ 
      success: true, 
      deleted_count: records.length,
      message: `${records.length} registros deletados com sucesso`
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
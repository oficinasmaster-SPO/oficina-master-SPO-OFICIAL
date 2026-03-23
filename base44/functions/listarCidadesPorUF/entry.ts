import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Obter UF do payload
        const { uf } = await req.json();
        
        if (!uf) {
            return Response.json({ error: 'UF não fornecida' }, { status: 400 });
        }

        // Validar UF (deve ter 2 caracteres)
        const cleanUF = uf.trim().toUpperCase();
        if (cleanUF.length !== 2) {
            return Response.json({ error: 'UF inválida' }, { status: 400 });
        }

        // Consultar API do IBGE para obter municípios
        const response = await fetch(
            `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${cleanUF}/municipios`
        );
        
        if (!response.ok) {
            return Response.json({ error: 'Erro ao consultar cidades' }, { status: 500 });
        }

        const data = await response.json();

        // Formatar dados (extrair apenas o nome do município)
        const cities = data.map(city => city.nome).sort();

        // Retornar lista de cidades
        return Response.json({
            uf: cleanUF,
            cities: cities
        });

    } catch (error) {
        console.error('Erro ao listar cidades:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
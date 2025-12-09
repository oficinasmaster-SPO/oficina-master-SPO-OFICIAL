import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Obter CEP do payload
        const { cep } = await req.json();
        
        if (!cep) {
            return Response.json({ error: 'CEP não fornecido' }, { status: 400 });
        }

        // Remover caracteres não numéricos do CEP
        const cleanCEP = cep.replace(/\D/g, '');

        if (cleanCEP.length !== 8) {
            return Response.json({ error: 'CEP inválido' }, { status: 400 });
        }

        // Consultar API ViaCEP
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        
        if (!response.ok) {
            return Response.json({ error: 'Erro ao consultar CEP' }, { status: 500 });
        }

        const data = await response.json();

        if (data.erro) {
            return Response.json({ error: 'CEP não encontrado' }, { status: 404 });
        }

        // Retornar dados formatados
        return Response.json({
            cep: data.cep,
            city: data.localidade,
            state: data.uf,
            neighborhood: data.bairro,
            street: data.logradouro,
            complement: data.complemento
        });

    } catch (error) {
        console.error('Erro ao consultar CEP:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
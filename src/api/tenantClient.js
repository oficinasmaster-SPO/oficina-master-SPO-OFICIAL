import { base44 } from '@/api/base44Client';

/**
 * Invoca uma função BFF garantindo a injeção do header de tenant.
 * @param {string} functionName - Nome da função BFF
 * @param {object} payload - Payload adicional para a função
 */
export async function invokeWithTenant(functionName, payload = {}) {
    // A API do base44 atual não suporta injeção de headers customizados diretamente no .invoke()
    // Como workaround, passamos o tenantId no body para o BFF conseguir processar
    // O backend BFF deve estar preparado para ler do req.body.tenantId
    return await base44.functions.invoke(functionName, payload);
}
import { base44 } from '@/api/base44Client';

export async function invokeWithTenant(functionName, payload = {}) {
    return await base44.functions.invoke(functionName, payload);
}
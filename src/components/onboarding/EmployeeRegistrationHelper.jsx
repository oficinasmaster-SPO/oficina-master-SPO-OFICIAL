import { base44 } from "@/api/base44Client";

// Versão: 2025-12-18 17:10 - Backend Function (necessário para permissões User)

export async function registerEmployeeViaBackend(inviteToken, formData) {
  console.log("🔵 [Backend] Chamando função...");

  try {
    const response = await base44.functions.invoke('registerInvitedEmployee', {
      token: inviteToken,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      profile_picture_url: formData.profile_picture_url
    });

    console.log("✅ Resposta:", response.data);

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return response.data;
  } catch (error) {
    console.error("❌ Erro:", error);
    throw error;
  }
}
import React from "react";
import { toast } from "sonner";

// Helper isolado para registro de colaborador via backend function
// Criado em: 2025-12-18 16:05

export async function registerEmployeeViaBackend(inviteToken, formData) {
  console.log("🔵 [EmployeeRegistrationHelper] Iniciando registro via backend...");
  console.log("🔵 Token:", inviteToken);
  console.log("🔵 Dados:", formData);

  try {
    const response = await fetch(`${window.location.origin}/.functions/registerInvitedEmployee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        token: inviteToken,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        profile_picture_url: formData.profile_picture_url
      })
    });

    console.log("🔵 [EmployeeRegistrationHelper] Response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("🔵 [EmployeeRegistrationHelper] Erro:", errorData);
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log("🔵 [EmployeeRegistrationHelper] Sucesso:", data);

    return data;
  } catch (error) {
    console.error("🔵 [EmployeeRegistrationHelper] Exception:", error);
    throw error;
  }
}
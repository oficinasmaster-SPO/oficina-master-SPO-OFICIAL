import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CadastroColaborador() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(createPageUrl("Colaboradores") + "?modal=cadastrocolaborador", { replace: true });
  }, [navigate]);
  
  return null;
}
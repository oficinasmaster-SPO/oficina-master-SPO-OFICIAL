import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, List, Plus } from "lucide-react";
import ContractList from "@/components/contracts/ContractList";
import ContractForm from "@/components/contracts/ContractForm";
import ContractTemplates from "@/components/contracts/ContractTemplates";

export default function GestaoContratos() {
  const [activeTab, setActiveTab] = useState("lista");
  const [editingContract, setEditingContract] = useState(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const result = await base44.entities.Contract.list('-created_date');
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user
  });

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.job_role !== 'acelerador')) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Restrito</h2>
          <p className="text-gray-600">
            Esta área é restrita a consultores e aceleradores.
          </p>
        </div>
      </div>
    );
  }

  const handleEdit = (contract) => {
    setEditingContract(contract);
    setActiveTab("criar");
  };

  const handleNew = () => {
    setEditingContract(null);
    setActiveTab("criar");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Contratos</h1>
          <p className="text-gray-600 mt-2">
            Crie, gerencie e acompanhe contratos de aceleração
          </p>
        </div>
        <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white shadow-md">
          <TabsTrigger value="lista">
            <List className="w-4 h-4 mr-2" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="criar">
            <FileText className="w-4 h-4 mr-2" />
            {editingContract ? 'Editar' : 'Criar'}
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <ContractList 
            contracts={contracts} 
            isLoading={isLoading}
            onEdit={handleEdit}
          />
        </TabsContent>

        <TabsContent value="criar">
          <ContractForm 
            contract={editingContract}
            user={user}
            onSuccess={() => {
              setActiveTab("lista");
              setEditingContract(null);
            }}
          />
        </TabsContent>

        <TabsContent value="templates">
          <ContractTemplates user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
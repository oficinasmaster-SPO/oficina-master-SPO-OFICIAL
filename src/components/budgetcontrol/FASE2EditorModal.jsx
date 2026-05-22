import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BarChart3 } from "lucide-react";
import SazonalidadeEditor from "./SazonalidadeEditor";
import HierarquiaOrcamentaria from "./HierarquiaOrcamentaria";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

export default function FASE2EditorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("sazonalidade");
  const { workshop } = useWorkshopContext();

  useEffect(() => {
    const handleOpenSazonalidade = () => {
      setIsOpen(true);
      setActiveTab("sazonalidade");
    };

    const handleOpenHierarquia = () => {
      setIsOpen(true);
      setActiveTab("hierarquia");
    };

    window.addEventListener('open-sazonalidade-editor', handleOpenSazonalidade);
    window.addEventListener('open-hierarquia-editor', handleOpenHierarquia);

    return () => {
      window.removeEventListener('open-sazonalidade-editor', handleOpenSazonalidade);
      window.removeEventListener('open-hierarquia-editor', handleOpenHierarquia);
    };
  }, []);

  if (!workshop) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            📊 FASE 2 — Controle Orçamentário Avançado
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sazonalidade">
              <TrendingUp className="w-4 h-4 mr-2" />
              Sazonalidade
            </TabsTrigger>
            <TabsTrigger value="hierarquia">
              <BarChart3 className="w-4 h-4 mr-2" />
              Hierarquia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sazonalidade">
            <SazonalidadeEditor 
              workshopId={workshop.id}
              onClose={() => setIsOpen(false)}
            />
          </TabsContent>

          <TabsContent value="hierarquia">
            <HierarquiaOrcamentaria 
              workshopId={workshop.id}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
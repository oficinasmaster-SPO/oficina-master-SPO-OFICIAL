import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { systemRoles } from "@/components/lib/systemRoles";

export default function RoleFormDialog({ open, onClose, role, onSave, isLoading }) {
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    system_roles: [], 
    status: "ativo" 
  });
  const [selectedModule, setSelectedModule] = useState(null);

  useEffect(() => {
    if (role) {
      setFormData(role);
    } else {
      setFormData({ name: "", description: "", system_roles: [], status: "ativo" });
    }
  }, [role, open]);

  const toggleRole = (roleId) => {
    setFormData(prev => ({
      ...prev,
      system_roles: prev.system_roles.includes(roleId)
        ? prev.system_roles.filter(r => r !== roleId)
        : [...prev.system_roles, roleId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "Editar Role" : "Nova Role"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              required 
              placeholder="Ex: Mentor, Técnico Sênior"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              rows={3}
              placeholder="Descreva o propósito desta role..."
            />
          </div>
          <div>
            <Label>Permissões ({formData.system_roles.length} selecionadas)</Label>
            <div className="border rounded p-3 max-h-96 overflow-y-auto space-y-2">
              {systemRoles.map(module => (
                <div key={module.id} className="border rounded">
                  <button 
                    type="button" 
                    onClick={() => setSelectedModule(selectedModule === module.id ? null : module.id)} 
                    className="w-full flex justify-between p-2 hover:bg-gray-50"
                  >
                    <span className="font-medium text-sm flex items-center gap-2">
                      <module.icon className="w-4 h-4" />
                      {module.name}
                    </span>
                    {selectedModule === module.id ? "▼" : "▶"}
                  </button>
                  {selectedModule === module.id && (
                    <div className="border-t p-2 space-y-1 bg-gray-50">
                      {module.roles.map(r => (
                        <label 
                          key={r.id} 
                          className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer"
                        >
                          <input 
                            type="checkbox" 
                            checked={formData.system_roles.includes(r.id)} 
                            onChange={() => toggleRole(r.id)}
                            className="mt-1"
                          />
                          <div>
                            <p className="text-sm font-medium">{r.name}</p>
                            <p className="text-xs text-gray-600">{r.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function DadosPessoais({ employee, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: employee.full_name || "",
    cpf: employee.cpf || "",
    rg: employee.rg || "",
    data_nascimento: employee.data_nascimento || "",
    telefone: employee.telefone || "",
    email: employee.email || "",
    position: employee.position || "",
    area: employee.area || "",
    hire_date: employee.hire_date || "",
    status: employee.status || "ativo",
    endereco: employee.endereco || {}
  });

  const handleSave = async () => {
    await onUpdate(formData);
    setEditing(false);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Dados Pessoais</CardTitle>
          {!editing ? (
            <Button onClick={() => setEditing(true)}>Editar</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome Completo *</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>CPF</Label>
            <Input
              value={formData.cpf}
              onChange={(e) => setFormData({...formData, cpf: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>RG</Label>
            <Input
              value={formData.rg}
              onChange={(e) => setFormData({...formData, rg: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Data de Nascimento</Label>
            <Input
              type="date"
              value={formData.data_nascimento}
              onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={formData.telefone}
              onChange={(e) => setFormData({...formData, telefone: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Cargo *</Label>
            <Input
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Área</Label>
            <Select value={formData.area} onValueChange={(value) => setFormData({...formData, area: value})} disabled={!editing}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendas">Vendas</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="gerencia">Gerência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de Contratação</Label>
            <Input
              type="date"
              value={formData.hire_date}
              onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
              disabled={!editing}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})} disabled={!editing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="ferias">Férias</SelectItem>
                <SelectItem value="afastado">Afastado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="font-semibold text-gray-900 mb-3">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Rua</Label>
              <Input
                value={formData.endereco?.rua || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, rua: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Número</Label>
              <Input
                value={formData.endereco?.numero || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, numero: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input
                value={formData.endereco?.bairro || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, bairro: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input
                value={formData.endereco?.cidade || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, cidade: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Input
                value={formData.endereco?.estado || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, estado: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>CEP</Label>
              <Input
                value={formData.endereco?.cep || ""}
                onChange={(e) => setFormData({...formData, endereco: {...formData.endereco, cep: e.target.value}})}
                disabled={!editing}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
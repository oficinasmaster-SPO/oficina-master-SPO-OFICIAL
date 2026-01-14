import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/formatters";

export default function RevenueDistributionModal({ 
  open, 
  onClose, 
  revenue, 
  employees, 
  onConfirm, 
  isLoading,
  onOpenEmployeeRegistration
}) {
  const [distribution, setDistribution] = useState({
    vendors: [],
    marketing: [],
    technicians: []
  });

  const [selectedVendors, setSelectedVendors] = useState([]);
  const [selectedMarketing, setSelectedMarketing] = useState([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState([]);

  useEffect(() => {
    if (open) {
      resetDistribution();
    }
  }, [open]);

  const resetDistribution = () => {
    setSelectedVendors([]);
    setSelectedMarketing([]);
    setSelectedTechnicians([]);
    setDistribution({
      vendors: [],
      marketing: [],
      technicians: []
    });
  };

  const getEmployeesByRole = (role) => {
    return employees.filter(e => e.job_role === role);
  };

  const vendors = getEmployeesByRole("vendas").concat(getEmployeesByRole("consultor_vendas"));
  const marketingTeam = getEmployeesByRole("marketing");
  const technicians = getEmployeesByRole("tecnico").concat(getEmployeesByRole("lider_tecnico"));

  const toggleVendor = (empId) => {
    setSelectedVendors(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleMarketing = (empId) => {
    setSelectedMarketing(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleTechnician = (empId) => {
    setSelectedTechnicians(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const updateVendorValue = (empId, value) => {
    setDistribution(prev => ({
      ...prev,
      vendors: prev.vendors.map(v =>
        v.id === empId ? { ...v, value: parseFloat(value) || 0 } : v
      )
    }));
  };

  const updateMarketingValue = (empId, value) => {
    setDistribution(prev => ({
      ...prev,
      marketing: prev.marketing.map(m =>
        m.id === empId ? { ...m, value: parseFloat(value) || 0 } : m
      )
    }));
  };

  const updateTechnicianValue = (empId, value) => {
    setDistribution(prev => ({
      ...prev,
      technicians: prev.technicians.map(t =>
        t.id === empId ? { ...t, value: parseFloat(value) || 0 } : t
      )
    }));
  };

  const handleSelectVendors = () => {
    const newVendors = selectedVendors.map(id => {
      const emp = vendors.find(v => v.id === id);
      return distribution.vendors.find(v => v.id === id) || {
        id,
        name: emp.full_name,
        value: 0
      };
    }).filter(v => !distribution.vendors.find(existing => existing.id === v.id));

    setDistribution(prev => ({
      ...prev,
      vendors: [...prev.vendors, ...newVendors]
    }));
  };

  const handleSelectMarketing = () => {
    const newMarketing = selectedMarketing.map(id => {
      const emp = marketingTeam.find(m => m.id === id);
      return distribution.marketing.find(m => m.id === id) || {
        id,
        name: emp.full_name,
        value: 0
      };
    }).filter(m => !distribution.marketing.find(existing => existing.id === m.id));

    setDistribution(prev => ({
      ...prev,
      marketing: [...prev.marketing, ...newMarketing]
    }));
  };

  const handleSelectTechnicians = () => {
    const newTechnicians = selectedTechnicians.map(id => {
      const emp = technicians.find(t => t.id === id);
      return distribution.technicians.find(t => t.id === id) || {
        id,
        name: emp.full_name,
        value: 0
      };
    }).filter(t => !distribution.technicians.find(existing => existing.id === t.id));

    setDistribution(prev => ({
      ...prev,
      technicians: [...prev.technicians, ...newTechnicians]
    }));
  };

  const removeVendor = (empId) => {
    setDistribution(prev => ({
      ...prev,
      vendors: prev.vendors.filter(v => v.id !== empId)
    }));
  };

  const removeMarketing = (empId) => {
    setDistribution(prev => ({
      ...prev,
      marketing: prev.marketing.filter(m => m.id !== empId)
    }));
  };

  const removeTechnician = (empId) => {
    setDistribution(prev => ({
      ...prev,
      technicians: prev.technicians.filter(t => t.id !== empId)
    }));
  };

  const totalVendors = distribution.vendors.reduce((sum, v) => sum + v.value, 0);
  const totalMarketing = distribution.marketing.reduce((sum, m) => sum + m.value, 0);
  const totalTechnicians = distribution.technicians.reduce((sum, t) => sum + t.value, 0);
  const totalDistributed = totalVendors + totalMarketing + totalTechnicians;

  const isValid = () => {
    const hasCollaborators = distribution.vendors.length > 0 || distribution.marketing.length > 0 || distribution.technicians.length > 0;
    
    if (!hasCollaborators) {
      return false;
    }
    
    // Permite valores zerados (atendimentos sem conversão)
    if (revenue === 0 && totalDistributed === 0) {
      return true;
    }
    
    return Math.abs(totalDistributed - revenue) < 0.01;
  };

  const handleSave = async () => {
    if (!isValid()) {
      toast.error("A distribuição não é válida ou não totaliza o faturamento");
      return;
    }
    await onConfirm(distribution);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-600" />
            Distribuição de Faturamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total a Distribuir */}
          <Card className="bg-blue-50 border-2 border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Total a Distribuir</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(revenue)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Distribuído</p>
                  <p className={`text-2xl font-bold ${totalDistributed === revenue ? 'text-green-700' : 'text-orange-700'}`}>
                    {formatCurrency(totalDistributed)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Diferença</p>
                  <p className={`text-2xl font-bold ${Math.abs(revenue - totalDistributed) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(revenue - totalDistributed)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aviso */}
          {revenue === 0 && (
            <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Registro sem faturamento:</strong> Selecione os colaboradores envolvidos. Valores podem ficar zerados para registrar atendimentos/agendamentos sem conversão.
              </div>
            </div>
          )}
          {!isValid() && revenue > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                A distribuição deve totalizar exatamente <strong>{formatCurrency(revenue)}</strong>
              </div>
            </div>
          )}

          {/* VENDEDORES */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">👤 Vendedores/Comercial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {vendors.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {vendors.map(vendor => (
                      <div key={vendor.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedVendors.includes(vendor.id)}
                          onCheckedChange={() => toggleVendor(vendor.id)}
                        />
                        <label className="text-sm flex-1 cursor-pointer">{vendor.full_name}</label>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleSelectVendors}
                    disabled={selectedVendors.length === 0}
                    variant="outline"
                    size="sm"
                  >
                    Adicionar Selecionados
                  </Button>

                  {distribution.vendors.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg space-y-3 border border-blue-200">
                      {distribution.vendors.map(vendor => (
                        <div key={vendor.id} className="flex items-center gap-3">
                          <span className="flex-1 text-sm font-semibold">{vendor.name}</span>
                          <Input
                            type="number"
                            value={vendor.value}
                            onChange={(e) => updateVendorValue(vendor.id, e.target.value)}
                            placeholder="0.00"
                            className="w-32 text-right"
                          />
                          <Button
                            onClick={() => onOpenEmployeeRegistration && onOpenEmployeeRegistration(vendor.id)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            📝
                          </Button>
                          <Button
                            onClick={() => removeVendor(vendor.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-blue-300">
                        <p className="text-sm font-bold text-blue-700">
                          Total: {formatCurrency(totalVendors)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Nenhum vendedor disponível</p>
              )}
            </CardContent>
          </Card>

          {/* MARKETING */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📣 Marketing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {marketingTeam.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {marketingTeam.map(mkt => (
                      <div key={mkt.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedMarketing.includes(mkt.id)}
                          onCheckedChange={() => toggleMarketing(mkt.id)}
                        />
                        <label className="text-sm flex-1 cursor-pointer">{mkt.full_name}</label>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleSelectMarketing}
                    disabled={selectedMarketing.length === 0}
                    variant="outline"
                    size="sm"
                  >
                    Adicionar Selecionados
                  </Button>

                  {distribution.marketing.length > 0 && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg space-y-3 border border-purple-200">
                      {distribution.marketing.map(mkt => (
                        <div key={mkt.id} className="flex items-center gap-3">
                          <span className="flex-1 text-sm font-semibold">{mkt.name}</span>
                          <Input
                            type="number"
                            value={mkt.value}
                            onChange={(e) => updateMarketingValue(mkt.id, e.target.value)}
                            placeholder="0.00"
                            className="w-32 text-right"
                          />
                          <Button
                            onClick={() => onOpenEmployeeRegistration && onOpenEmployeeRegistration(mkt.id)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            📝
                          </Button>
                          <Button
                            onClick={() => removeMarketing(mkt.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-purple-300">
                        <p className="text-sm font-bold text-purple-700">
                          Total: {formatCurrency(totalMarketing)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Nenhum responsável por marketing disponível</p>
              )}
            </CardContent>
          </Card>

          {/* TÉCNICOS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔧 Técnicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {technicians.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {technicians.map(tech => (
                      <div key={tech.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedTechnicians.includes(tech.id)}
                          onCheckedChange={() => toggleTechnician(tech.id)}
                        />
                        <label className="text-sm flex-1 cursor-pointer">{tech.full_name}</label>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleSelectTechnicians}
                    disabled={selectedTechnicians.length === 0}
                    variant="outline"
                    size="sm"
                  >
                    Adicionar Selecionados
                  </Button>

                  {distribution.technicians.length > 0 && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg space-y-3 border border-green-200">
                      {distribution.technicians.map(tech => (
                        <div key={tech.id} className="flex items-center gap-3">
                          <span className="flex-1 text-sm font-semibold">{tech.name}</span>
                          <Input
                            type="number"
                            value={tech.value}
                            onChange={(e) => updateTechnicianValue(tech.id, e.target.value)}
                            placeholder="0.00"
                            className="w-32 text-right"
                          />
                          <Button
                            onClick={() => onOpenEmployeeRegistration && onOpenEmployeeRegistration(tech.id)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            📝
                          </Button>
                          <Button
                            onClick={() => removeTechnician(tech.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-green-300">
                        <p className="text-sm font-bold text-green-700">
                          Total: {formatCurrency(totalTechnicians)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Nenhum técnico disponível</p>
              )}
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={resetDistribution}
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpar
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid() || isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Salvando..." : "Confirmar Distribuição"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileCheck, Eye } from "lucide-react";

export default function MAPDetailedView({ 
  map, 
  its, 
  onAddIT, 
  onViewIT,
  onAddResponsibility,
  onAddIndicator,
  canManage 
}) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-gray-600">{map.code}</span>
              <Badge className={map.status === 'ativo' ? 'bg-green-100 text-green-700' : ''}>
                {map.status}
              </Badge>
            </div>
            <CardTitle className="text-2xl">{map.title}</CardTitle>
            <p className="text-gray-600 mt-1">{map.description}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="its">ITs ({its.length})</TabsTrigger>
            <TabsTrigger value="responsibilities">Responsabilidades</TabsTrigger>
            <TabsTrigger value="indicators">Indicadores</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <section>
              <h3 className="text-lg font-bold border-b pb-2 mb-3">Objetivo</h3>
              <p className="text-gray-700 whitespace-pre-line">{map.objective || "Não definido"}</p>
            </section>
            <section>
              <h3 className="text-lg font-bold border-b pb-2 mb-3">Campo de Aplicação</h3>
              <p className="text-gray-700 whitespace-pre-line">{map.scope || "Não definido"}</p>
            </section>
            <section>
              <h3 className="text-lg font-bold border-b pb-2 mb-3">Fluxo do Processo</h3>
              <p className="text-gray-700 whitespace-pre-line mb-4">{map.process_flow || "Não definido"}</p>
              {map.flowchart_url && (
                <img src={map.flowchart_url} alt="Fluxograma" className="border rounded max-w-full" />
              )}
            </section>
          </TabsContent>

          <TabsContent value="its" className="space-y-3 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Instruções de Trabalho</h3>
              {canManage && (
                <Button size="sm" onClick={onAddIT}>
                  <Plus className="w-4 h-4 mr-2" /> Nova IT
                </Button>
              )}
            </div>
            {its.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma IT vinculada</p>
            ) : (
              its.map(it => (
                <Card key={it.id} className="hover:shadow-md cursor-pointer" onClick={() => onViewIT(it)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm text-gray-600">{it.code}</span>
                        <h4 className="font-semibold">{it.title}</h4>
                      </div>
                      <FileCheck className="w-5 h-5 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="responsibilities" className="mt-6">
            {map.responsibilities?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Ferramentas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {map.responsibilities.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.activity}</TableCell>
                      <TableCell>{r.responsible}</TableCell>
                      <TableCell>{r.tools}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhuma responsabilidade definida</p>
            )}
          </TabsContent>

          <TabsContent value="indicators" className="mt-6">
            {map.indicators?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicador</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Como Medir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {map.indicators.map((ind, i) => (
                    <TableRow key={i}>
                      <TableCell>{ind.name}</TableCell>
                      <TableCell>{ind.target}</TableCell>
                      <TableCell>{ind.measurement}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum indicador definido</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
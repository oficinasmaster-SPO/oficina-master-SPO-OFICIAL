import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer } from "lucide-react";

export default function PrintPlanoModal({ open, onClose, plan, workshop }) {
  const [sections, setSections] = React.useState({
    resumo: true,
    pilares: true,
    cronograma: true,
    indicadores: true,
    proximos: true
  });

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    // SECURITY: Build HTML via DOM API instead of innerHTML injection to prevent XSS.
    // User/AI-generated content is passed only as textContent, never as innerHTML.
    const doc = printWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <title>Plano de Aceleração</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #4F46E5; border-bottom: 3px solid #4F46E5; padding-bottom: 10px; }
        h2 { color: #1F2937; margin-top: 30px; }
        h3 { color: #374151; margin-top: 20px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-alta { background: #FEE2E2; color: #991B1B; }
        .badge-media { background: #FEF3C7; color: #92400E; }
        .badge-baixa { background: #D1FAE5; color: #065F46; }
        .activity { margin: 15px 0; padding: 15px; border: 1px solid #E5E7EB; border-radius: 8px; }
        .activity.concluida { background: #F0FDF4; }
        .indicator { margin: 10px 0; padding: 10px; background: #F9FAFB; border-radius: 6px; }
        ul { list-style: none; padding-left: 0; }
        li { margin: 8px 0; padding-left: 20px; position: relative; }
        li:before { content: "✓"; position: absolute; left: 0; color: #4F46E5; font-weight: bold; }
        @media print { body { padding: 10px; } }
      </style>
    </head><body></body></html>`);
    doc.close();

    const t = (str) => doc.createTextNode(str ?? '');
    const el = (tag, cls) => { const e = doc.createElement(tag); if (cls) e.className = cls; return e; };

    const body = doc.body;

    const h1 = el('h1'); h1.appendChild(t(`Plano de Aceleração - ${workshop.name}`)); body.appendChild(h1);
    const metaRef = el('p'); metaRef.appendChild(t(`Mês de Referência: ${new Date(plan.reference_month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`)); body.appendChild(metaRef);
    const metaFase = el('p'); metaFase.appendChild(t(`Fase da Oficina: ${plan.phase}`)); body.appendChild(metaFase);

    if (sections.resumo && plan.plan_data) {
      const div = el('div'); body.appendChild(div);
      const h = el('h2'); h.appendChild(t('Resumo do Diagnóstico')); div.appendChild(h);
      const p = el('p'); p.appendChild(t(plan.plan_data.diagnostic_summary)); div.appendChild(p);
      const h3 = el('h3'); h3.appendChild(t('Objetivo Principal (90 dias)')); div.appendChild(h3);
      const b = el('p'); const strong = el('strong'); strong.appendChild(t(plan.plan_data.main_objective_90_days)); b.appendChild(strong); div.appendChild(b);
    }

    if (sections.pilares && plan.plan_data?.pillar_directions) {
      const div = el('div'); body.appendChild(div);
      const h = el('h2'); h.appendChild(t('Direcionamentos por Pilar')); div.appendChild(h);
      plan.plan_data.pillar_directions.forEach(pillar => {
        const pdiv = el('div'); pdiv.style.marginBottom = '15px'; div.appendChild(pdiv);
        const h3 = el('h3'); h3.appendChild(t(`${pillar.pillar_name} `));
        const badge = el('span', `badge badge-${pillar.priority}`); badge.appendChild(t((pillar.priority || '').toUpperCase())); h3.appendChild(badge); pdiv.appendChild(h3);
        const p = el('p'); p.appendChild(t(pillar.direction)); pdiv.appendChild(p);
      });
    }

    if (sections.cronograma && plan.plan_data?.implementation_schedule) {
      const div = el('div'); body.appendChild(div);
      const h = el('h2'); h.appendChild(t('Cronograma de Implementação')); div.appendChild(h);
      plan.plan_data.implementation_schedule.forEach(activity => {
        const adiv = el('div', `activity${activity.status === 'concluida' ? ' concluida' : ''}`); div.appendChild(adiv);
        const h3 = el('h3'); h3.appendChild(t(activity.activity_name)); adiv.appendChild(h3);
        const p = el('p'); p.appendChild(t(activity.description)); adiv.appendChild(p);
        const info = el('p'); info.innerHTML = ''; 
        const bPrazo = el('strong'); bPrazo.appendChild(t('Prazo: ')); info.appendChild(bPrazo); info.appendChild(t(`${activity.deadline_days} dias | `));
        const bStatus = el('strong'); bStatus.appendChild(t('Status: ')); info.appendChild(bStatus); info.appendChild(t(activity.status));
        adiv.appendChild(info);
      });
    }

    if (sections.indicadores && plan.plan_data?.key_indicators) {
      const div = el('div'); body.appendChild(div);
      const h = el('h2'); h.appendChild(t('Indicadores Essenciais')); div.appendChild(h);
      plan.plan_data.key_indicators.forEach(indicator => {
        const idiv = el('div', 'indicator'); div.appendChild(idiv);
        const h3 = el('h3'); h3.appendChild(t(indicator.indicator_name)); idiv.appendChild(h3);
        const pv = el('p');
        const bAt = el('strong'); bAt.appendChild(t('Atual: ')); pv.appendChild(bAt); pv.appendChild(t(`${indicator.current_value} | `));
        const bMeta = el('strong'); bMeta.appendChild(t('Meta: ')); pv.appendChild(bMeta); pv.appendChild(t(indicator.target_value));
        idiv.appendChild(pv);
        const pf = el('p');
        const bFreq = el('strong'); bFreq.appendChild(t('Frequência: ')); pf.appendChild(bFreq); pf.appendChild(t(indicator.measurement_frequency));
        idiv.appendChild(pf);
      });
    }

    if (sections.proximos && plan.plan_data?.next_steps_week) {
      const div = el('div'); body.appendChild(div);
      const h = el('h2'); h.appendChild(t('Próximos Passos da Semana')); div.appendChild(h);
      const ul = el('ul'); div.appendChild(ul);
      plan.plan_data.next_steps_week.forEach(step => {
        const li = el('li'); li.appendChild(t(step)); ul.appendChild(li);
      });
    }

    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Imprimir Plano de Aceleração</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-gray-600">Selecione as seções que deseja imprimir:</p>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox 
                checked={sections.resumo} 
                onCheckedChange={(checked) => setSections({...sections, resumo: checked})}
              />
              <span>Resumo do Diagnóstico</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox 
                checked={sections.pilares} 
                onCheckedChange={(checked) => setSections({...sections, pilares: checked})}
              />
              <span>Direcionamentos por Pilar</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox 
                checked={sections.cronograma} 
                onCheckedChange={(checked) => setSections({...sections, cronograma: checked})}
              />
              <span>Cronograma de Implementação</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox 
                checked={sections.indicadores} 
                onCheckedChange={(checked) => setSections({...sections, indicadores: checked})}
              />
              <span>Indicadores Essenciais</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox 
                checked={sections.proximos} 
                onCheckedChange={(checked) => setSections({...sections, proximos: checked})}
              />
              <span>Próximos Passos</span>
            </label>
          </div>
        </div>

        {/* Conteúdo oculto para impressão */}
        <div id="print-plan-content" style={{ display: 'none' }}>
          <h1>Plano de Aceleração - {workshop.name}</h1>
          <p><strong>Mês de Referência:</strong> {new Date(plan.reference_month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
          <p><strong>Fase da Oficina:</strong> {plan.phase}</p>
          
          {sections.resumo && (
            <div>
              <h2>Resumo do Diagnóstico</h2>
              <p>{plan.plan_data.diagnostic_summary}</p>
              <h3>Objetivo Principal (90 dias)</h3>
              <p><strong>{plan.plan_data.main_objective_90_days}</strong></p>
            </div>
          )}
          
          {sections.pilares && (
            <div>
              <h2>Direcionamentos por Pilar</h2>
              {plan.plan_data.pillar_directions?.map((pillar, i) => (
                <div key={i} style={{ marginBottom: '15px' }}>
                  <h3>{pillar.pillar_name} <span className={`badge badge-${pillar.priority}`}>{pillar.priority?.toUpperCase()}</span></h3>
                  <p>{pillar.direction}</p>
                </div>
              ))}
            </div>
          )}
          
          {sections.cronograma && (
            <div>
              <h2>Cronograma de Implementação</h2>
              {plan.plan_data.implementation_schedule?.map((activity, i) => (
                <div key={i} className={`activity ${activity.status === 'concluida' ? 'concluida' : ''}`}>
                  <h3>{activity.activity_name}</h3>
                  <p>{activity.description}</p>
                  <p><strong>Prazo:</strong> {activity.deadline_days} dias | <strong>Status:</strong> {activity.status}</p>
                </div>
              ))}
            </div>
          )}
          
          {sections.indicadores && (
            <div>
              <h2>Indicadores Essenciais</h2>
              {plan.plan_data.key_indicators?.map((indicator, i) => (
                <div key={i} className="indicator">
                  <h3>{indicator.indicator_name}</h3>
                  <p><strong>Atual:</strong> {indicator.current_value} | <strong>Meta:</strong> {indicator.target_value}</p>
                  <p><strong>Frequência:</strong> {indicator.measurement_frequency}</p>
                </div>
              ))}
            </div>
          )}
          
          {sections.proximos && (
            <div>
              <h2>Próximos Passos da Semana</h2>
              <ul>
                {plan.plan_data.next_steps_week?.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
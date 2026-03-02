import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Package, Store, Clock, ArrowRight, User, Timer, Users, Calendar } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://10.47.25.234:8020/dashboard/metrics');
        const result = await response.json();
        if (!result.error) {
          setData(result);
        }
      } catch (error) {
        console.error("Erro ao carregar Dashboard:", error);
      }
      setLoading(false);
    };

    fetchMetrics();
  }, []);

  // MOCKS DOS GARGALOS E DISTRIBUIÇÃO
  const gargalosRegular = [
    { trecho: "M104 -> M204", time: "4.2", pct: 100 },
    { trecho: "M301 -> M402", time: "3.5", pct: 85 },
    { trecho: "M102 -> M104", time: "2.8", pct: 65 },
  ];

  const gargalosVarejo = [
    { trecho: "M502 -> M504", time: "2.9", pct: 100 },
    { trecho: "M403 -> M501", time: "2.4", pct: 80 },
    { trecho: "M205 -> M301", time: "1.8", pct: 60 },
  ];

  const distribRegular = [
    { id: 1, name: "C. 1", allocated: 4, pct: 0.26 },
    { id: 2, name: "C. 2", allocated: 5, pct: 0.27 },
    { id: 3, name: "C. 3", allocated: 3, pct: 0.18 },
    { id: 4, name: "C. 4", allocated: 2, pct: 0.16 },
    { id: 5, name: "C. 5", allocated: 2, pct: 0.13 },
  ];

  const distribVarejo = [
    { id: 1, name: "C. 1", allocated: 1, pct: 0.20 },
    { id: 2, name: "C. 2", allocated: 1, pct: 0.20 },
    { id: 3, name: "C. 3", allocated: 1, pct: 0.20 },
    { id: 4, name: "C. 4", allocated: 0, pct: 0.15 },
    { id: 5, name: "C. 5", allocated: 1, pct: 0.25 },
  ];

  const renderChart = (chartData: any[], color: string) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickMargin={10} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => value.toLocaleString('pt-BR') + ' pçs'} />
        <Line type="monotone" dataKey="processado" name="Processado" stroke={color} strokeWidth={2} dot={{ r: 2 }} />
        <Line type="stepAfter" dataKey="gargalo" name="Capacidade Ref." stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1.5} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderTurnoLinhas = (t1: string, t2: string, t3: string) => (
    <div className="flex flex-col gap-2 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
      <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
        <span className="flex items-center gap-2 text-slate-600 font-medium"><Clock size={16}/> Turno 1 (06h-14h)</span>
        <span className="font-bold text-slate-800">{t1} <span className="text-xs font-normal text-slate-500">peças</span></span>
      </div>
      <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
        <span className="flex items-center gap-2 text-slate-600 font-medium"><Clock size={16}/> Turno 2 (14h-22h)</span>
        <span className="font-bold text-slate-800">{t2} <span className="text-xs font-normal text-slate-500">peças</span></span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="flex items-center gap-2 text-slate-600 font-medium"><Clock size={16}/> Turno 3 (22h-06h)</span>
        <span className="font-bold text-slate-800">{t3} <span className="text-xs font-normal text-slate-500">peças</span></span>
      </div>
    </div>
  );

  const renderGargalos = (gargalos: any[]) => (
    <div className="mt-6 border-t border-slate-100 pt-6">
      <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Timer size={16} className="text-red-500"/> Top 3 Gargalos de Trecho</h3>
      <div className="flex flex-col gap-3">
        {gargalos.map((b, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-24 text-xs font-bold text-slate-600 flex justify-between">
              {b.trecho.split(' -> ')[0]} <ArrowRight size={12} className="text-slate-400"/> {b.trecho.split(' -> ')[1]}
            </div>
            <div className="flex-1 bg-slate-100 rounded-full h-2">
              <div className={`h-full rounded-full transition-all ${b.pct > 80 ? 'bg-red-400' : b.pct > 50 ? 'bg-amber-400' : 'bg-blue-400'}`} style={{width: `${b.pct}%`}}></div>
            </div>
            <div className="w-12 text-right text-xs font-semibold text-slate-600">{b.time} m</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDistribuicao = (distribuicao: any[], titleColor: string) => (
    <div className="mt-6 border-t border-slate-100 pt-6">
      <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Users size={16} className={titleColor}/> Equipe Alocada (Real)</h3>
      <div className="flex gap-2 justify-between">
        {distribuicao.map(aisle => (
          <div key={aisle.id} className="bg-slate-50 flex-1 p-2 rounded-lg border border-slate-200 flex flex-col items-center text-center">
            <h4 className="font-bold text-slate-700 text-[10px] leading-tight">{aisle.name}</h4>
            <div className="text-sm font-black text-slate-800 my-1">{aisle.allocated}</div>
            <div className="flex flex-wrap justify-center gap-0.5 mt-auto">
                {Array.from({length: aisle.allocated}).map((_, i) => <User key={i} size={10} className="text-slate-400" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <div className="p-6 text-slate-500 font-bold animate-pulse">Carregando telemetria ao vivo da operação...</div>;
  }

  if (!data) return <div className="p-6 text-red-500">Falha ao conectar com o servidor.</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-end mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Visão Geral da Operação</h1>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-sm font-bold text-slate-600">
          <Calendar size={18} className="text-blue-500"/>
          Exibindo dados do D0: {data.target_date}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* COLUNA: REGULAR */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center gap-3 mb-4 border-b pb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Package size={24} /></div>
            <h2 className="text-xl font-bold text-slate-800">Atendimento Regular</h2>
          </div>
          
          {data.regular.rho > 0.85 && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 text-sm flex items-center rounded-r-lg">
              <AlertTriangle size={16} className="mr-2" /> Pico de saturação detectado (ρ: {(data.regular.rho * 100).toFixed(1)}%)
            </div>
          )}

          {renderTurnoLinhas(data.regular.turnos.t1, data.regular.turnos.t2, data.regular.turnos.t3)}

          <div className="h-48 mb-2">
            {renderChart(data.regular.hourly, "#3b82f6")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-auto">
            {renderGargalos(gargalosRegular)}
            {renderDistribuicao(distribRegular, "text-blue-500")}
          </div>
        </div>

        {/* COLUNA: VAREJO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center gap-3 mb-4 border-b pb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Store size={24} /></div>
            <h2 className="text-xl font-bold text-slate-800">Atendimento Varejo</h2>
          </div>

          {data.varejo.rho > 0.85 && (
             <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 text-sm flex items-center rounded-r-lg">
               <AlertTriangle size={16} className="mr-2" /> Pico de saturação detectado (ρ: {(data.varejo.rho * 100).toFixed(1)}%)
             </div>
          )}

          {renderTurnoLinhas(data.varejo.turnos.t1, data.varejo.turnos.t2, data.varejo.turnos.t3)}

          <div className="h-48 mb-2">
            {renderChart(data.varejo.hourly, "#10b981")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-auto">
            {renderGargalos(gargalosVarejo)}
            {renderDistribuicao(distribVarejo, "text-emerald-500")}
          </div>
        </div>

      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import KpiCard from '../components/KpiCard';
import { ProjectionChart } from '../components/Charts';
// Importações corrigidas
import { Users, Timer, Activity, PackageOpen, ArrowRight, User, Calendar, Map, Tags, Crosshair, Layers, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

export default function Simulation() {
  const [operators, setOperators] = useState(20);
  const [skill, setSkill] = useState(1.0);
  
  const [startDate, setStartDate] = useState('2026-02-10');
  const [endDate, setEndDate] = useState('2026-02-28');

  const [atendimento, setAtendimento] = useState({ regular: true, varejo: true });
  const [turnos, setTurnos] = useState({ t1: true, t2: true, t3: true });

  const [kpis, setKpis] = useState({ avgThroughput: 0, totalPecas: 0, tempoSistema: "00:00h", avgUtilization: 0 });
  const [gargalos, setGargalos] = useState<any[]>([]);
  const [distribuicao, setDistribuicao] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]); 
  const [estacoes, setEstacoes] = useState<any[]>([]);
  const [induction, setInduction] = useState<any[]>([]); // NOVO ESTADO
  const [loading, setLoading] = useState(false);

  const handleAtendimentoChange = (tipo: 'regular' | 'varejo') => {
    setAtendimento(prev => {
      const newState = { ...prev, [tipo]: !prev[tipo] };
      return (!newState.regular && !newState.varejo) ? prev : newState;
    });
  };

  const handleTurnosChange = (turno: 't1' | 't2' | 't3') => {
    setTurnos(prev => {
      const newState = { ...prev, [turno]: !prev[turno] };
      return (!newState.t1 && !newState.t2 && !newState.t3) ? prev : newState;
    });
  };
  const [efficiencyCurve, setEfficiencyCurve] = useState<any[]>([]);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://10.47.25.234:8020/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: startDate, end_date: endDate, atendimento, turnos, operators, skill
        })
      });

      if (!response.ok) throw new Error("Erro ao buscar dados do servidor");
      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
      } else {
        setKpis(data.kpis);
        // setEfficiencyCurve movido para o lugar correto (após receber data)
        setEfficiencyCurve(data.efficiencyCurve || []);
        setGargalos(data.gargalos || []);
        setDistribuicao(data.distribuicao || []);
        setCategorias(data.categorias || []);
        setChartData(data.chartData || []); 
        setEstacoes(data.estacoes || []);
        setInduction(data.induction || []);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };


  useEffect(() => {
    handleSimulate();
  }, []);

  const getHeatColor = (pct: number) => {
    if (pct >= 0.25) return "bg-red-100 border-red-400 text-red-800";
    if (pct >= 0.18) return "bg-amber-100 border-amber-400 text-amber-800";
    return "bg-emerald-100 border-emerald-400 text-emerald-800";
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-6 relative">
      
      {/* PAINEL DE CONTROLES */}
      <div className="w-full xl:w-1/4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar z-40">
        <h2 className="text-xl font-bold mb-6 text-slate-800">Parâmetros</h2>
        
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" /> Período Real
          </label>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Data Inicial</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-sm p-2 rounded-md border border-slate-200" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Data Final</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-sm p-2 rounded-md border border-slate-200" />
            </div>
          </div>
        </div>

        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-3">Tipo de Atendimento</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={atendimento.regular} onChange={() => handleAtendimentoChange('regular')} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-slate-700 text-sm">Regular (Alto Volume)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={atendimento.varejo} onChange={() => handleAtendimentoChange('varejo')} className="w-4 h-4 text-emerald-600 rounded" />
              <span className="text-slate-700 text-sm">Varejo</span>
            </label>
          </div>
        </div>

        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-3">Turnos (8h)</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={turnos.t1} onChange={() => handleTurnosChange('t1')} className="w-4 h-4 text-indigo-600 rounded" />
              <span className="text-slate-700 text-sm">Turno 1 <span className="text-xs text-slate-400">(06h-14h)</span></span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={turnos.t2} onChange={() => handleTurnosChange('t2')} className="w-4 h-4 text-indigo-600 rounded" />
              <span className="text-slate-700 text-sm">Turno 2 <span className="text-xs text-slate-400">(14h-22h)</span></span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={turnos.t3} onChange={() => handleTurnosChange('t3')} className="w-4 h-4 text-indigo-600 rounded" />
              <span className="text-slate-700 text-sm">Turno 3 <span className="text-xs text-slate-400">(22h-06h)</span></span>
            </label>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-600 mb-2">Total Operadores Ativos: <span className="font-bold text-blue-600">{operators}</span></label>
          <input type="range" min="5" max="40" value={operators} onChange={(e) => setOperators(Number(e.target.value))} className="w-full accent-blue-600" />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-600 mb-2">Habilidade Média: {(skill * 100).toFixed(0)}%</label>
          <input type="range" min="0.5" max="1.5" step="0.1" value={skill} onChange={(e) => setSkill(Number(e.target.value))} className="w-full accent-blue-600" />
        </div>

        <button 
          onClick={handleSimulate} 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 mt-4 shadow-md"
        >
          <Activity size={18} /> {loading ? "Calculando..." : "Rodar Simulação"}
        </button>
      </div>

      {/* PAINEL CENTRAL DE RESULTADOS */}
      <div className="w-full xl:w-3/4 flex flex-col gap-6">
        
        {/* KPIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Throughput Médio" value={kpis.avgThroughput.toLocaleString('pt-BR')} unit="cx/h" icon={<Activity />} />
          <KpiCard title="Total Peças Pickadas" value={kpis.totalPecas.toLocaleString('pt-BR')} unit="pçs/h" icon={<PackageOpen />} />
          <KpiCard title="Tempo no Sistema (W)" value={kpis.tempoSistema} unit="" icon={<Timer />} />
          <KpiCard title="Utilização (ρ)" value={kpis.avgUtilization} unit="%" icon={<Users />} alert={kpis.avgUtilization > 85} />
        </div>

        {/* GRÁFICO REAL */}
        {chartData.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Projeção da Linha do Tempo (Real)</h2>
            <ProjectionChart data={chartData} />
          </div>
        )}

        {efficiencyCurve.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500"/> Curva de Eficiência vs. Mão de Obra
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={efficiencyCurve}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="ops" label={{ value: 'Operadores', position: 'insideBottom', offset: -5 }} />
                <YAxis yAxisId="left" label={{ value: 'Capacidade (cx/h)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" unit="%" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="throughput" name="Capacidade Total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="efficiency" name="% Eficiência Individual" stroke="#ef4444" strokeWidth={3} dot={{ r: 6 }} />
                
                {/* Linha indicadora do ponto atual escolhido no slider */}
                <ReferenceLine yAxisId="left" x={operators} stroke="orange" strokeDasharray="3 3" label="Ponto Atual" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500 mt-4 italic">
            * O declínio na linha vermelha indica perda de produtividade por interferência física e saturação de postos de trabalho.
          </p>
        </div>
      )}

        {/* COLUNAS: GARGALOS E DISTRIBUIÇÃO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
              <Timer size={20} className="text-red-500"/> Maior Gargalo de Pulo (Real)
            </h2>
            <div className="flex flex-col gap-4 mt-4">
              {gargalos.length === 0 ? <p className="text-sm text-slate-500">Sem dados para este filtro.</p> : 
                gargalos.map((b, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-bold text-slate-700 flex items-center justify-between">
                    {b.trecho.split(' -> ')[0]} <ArrowRight size={14} className="text-slate-400"/> {b.trecho.split(' -> ')[1]}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${b.pct > 80 ? 'bg-red-500' : b.pct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{width: `${b.pct}%`}}></div>
                  </div>
                  <div className="w-24 text-right font-semibold text-slate-600">{b.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-blue-500"/> Distribuição Racional de Equipe
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {distribuicao.map(aisle => (
                <div key={aisle.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col items-center text-center">
                  <h3 className="font-bold text-slate-700 text-[11px]">{aisle.name.split(' ')[0]} {aisle.name.split(' ')[1]}</h3>
                  <p className="text-[10px] text-slate-500 mb-1">{(aisle.pct * 100).toFixed(0)}% da carga</p>
                  <div className="text-2xl font-black text-blue-600 mb-2">{aisle.allocated} <span className="text-xs font-normal text-slate-500">ops</span></div>
                  <div className="flex flex-wrap justify-center gap-1 mt-auto">
                     {Array.from({length: aisle.allocated}).map((_, i) => <User key={i} size={14} className="text-blue-400" />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- NOVO: MIX DE INDUÇÃO POR TURNO --- */}
        {induction.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
              <Layers size={20} className="text-indigo-500"/> Mix de Indução na Linha (Varejo vs Regular)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {induction.map((shift, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4">
                  
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-800 text-lg">Turno {shift.turno.replace('T', '')}</span>
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold shadow-sm">
                      {shift.cadence} cx/min
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Regular ({shift.regularPct}%)</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Varejo ({shift.varejoPct}%)</span>
                    </div>
                    {/* Barra de Proporção */}
                    <div className="w-full bg-emerald-500 rounded-full h-3 overflow-hidden flex shadow-inner">
                      <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${shift.regularPct}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-400 text-center font-semibold mt-1">
                    Volume Total Injetado: <span className="text-slate-600">{shift.total.toLocaleString('pt-BR')} caixas</span>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAPA ESQUEMÁTICO, CATEGORIAS E TOP ESTAÇÕES */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LADO ESQUERDO: LAYOUT */}
            <div>
              <h2 className="text-lg font-bold mb-6 text-slate-800 flex items-center gap-2">
                <Map size={20} className="text-indigo-500"/> Calor por Corredor
              </h2>
              <div className="flex flex-col gap-2 relative border-l-4 border-slate-300 pl-4 ml-2">
                <div className="absolute -left-[14px] top-0 bottom-0 flex flex-col justify-between py-2">
                   <div className="w-6 h-6 rounded-full bg-slate-300 text-white flex items-center justify-center text-xs font-bold shadow">IN</div>
                   <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shadow">OUT</div>
                </div>
                {distribuicao.map((aisle) => (
                  <div key={aisle.id} className={`p-4 border-2 rounded-lg shadow-sm flex items-center justify-between transition-colors ${getHeatColor(aisle.pct)}`}>
                    <h4 className="font-bold text-sm">{aisle.name.split(' ')[0]} {aisle.name.split(' ')[1]}</h4>
                    <span className="text-lg font-black block">{(aisle.pct * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MEIO: TOP ESTAÇÕES */}
            <div>
              <h2 className="text-lg font-bold mb-6 text-slate-800 flex items-center gap-2">
                <Crosshair size={20} className="text-red-500"/> Top 10 Estações (Peças/h)
              </h2>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 h-full flex flex-col gap-2">
                {estacoes.length === 0 ? <p className="text-xs text-slate-500">Sem dados.</p> : estacoes.map((est, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0">
                    <span className="font-bold text-slate-700 text-sm">{est.estacao}</span>
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">
                      {est.pecas_hora.toLocaleString('pt-BR')} un.
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* LADO DIREITO: PERFIL MATERIAL */}
            <div>
              <h2 className="text-lg font-bold mb-6 text-slate-800 flex items-center gap-2">
                <Tags size={20} className="text-emerald-500"/> Perfil de Material
              </h2>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col gap-5 h-full">
                {categorias.map((cat, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                      <span>{cat.cat}</span>
                      <span>{cat.pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1 overflow-hidden">
                      <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700" style={{ width: `${cat.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
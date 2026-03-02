import React, { useState, useEffect } from 'react';
import { Target, Users, Activity, AlertTriangle, CheckCircle, TrendingUp, History, PackageSearch, Calendar } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function Scenarios() {
  const [volumeTotal, setVolumeTotal] = useState(250000);
  const [pctFracionado, setPctFracionado] = useState(75);
  const [diasAlvo, setDiasAlvo] = useState(3);
  const [headcount, setHeadcount] = useState(20);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://10.47.25.234:8020/scenarios/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volume_total: volumeTotal,
          pct_fracionado: pctFracionado,
          dias_alvo: diasAlvo,
          headcount: headcount
        })
      });
      const data = await response.json();
      if(data.error) alert(data.error);
      else setResults(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => { handleSimulate(); }, []);

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-6">
      
      {/* PAINEL DE INPUTS (PLAYGROUND S&OP) */}
      <div className="w-full xl:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar z-40">
        <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
          <Target className="text-blue-600"/> Planejamento S&OP
        </h2>

        <div className="flex flex-col gap-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Meta de Expedição</h3>
            <div className="mb-4">
              <label className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Volume Total (Peças)</span> <span>{volumeTotal.toLocaleString('pt-BR')}</span>
              </label>
              <input type="range" min="10000" max="1000000" step="5000" value={volumeTotal} onChange={(e)=>setVolumeTotal(Number(e.target.value))} className="w-full accent-blue-600" />
            </div>
            <div className="mb-4">
              <label className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Carga de Fracionamento (FR)</span> <span>{pctFracionado}%</span>
              </label>
              <input type="range" min="0" max="100" value={pctFracionado} onChange={(e)=>setPctFracionado(Number(e.target.value))} className="w-full accent-indigo-500" />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-500 mt-2 px-1">
               <span>GV: {((100 - pctFracionado) * volumeTotal / 100).toLocaleString('pt-BR')} pçs</span>
               <span>FR: {(pctFracionado * volumeTotal / 100).toLocaleString('pt-BR')} pçs</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Recursos Operacionais</h3>
            <div className="mb-4">
              <label className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Prazo de Distribuição</span> <span>{diasAlvo} Dias</span>
              </label>
              <input type="range" min="1" max="7" value={diasAlvo} onChange={(e)=>setDiasAlvo(Number(e.target.value))} className="w-full accent-orange-500" />
            </div>
            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Headcount Focado em Picking</span> <span>{headcount} Pessoas</span>
              </label>
              <input type="range" min="10" max="150" value={headcount} onChange={(e)=>setHeadcount(Number(e.target.value))} className="w-full accent-purple-500" />
              <p className="text-[10px] text-slate-400 mt-1 italic">*Base calc: 514 pçs(h)/pessoa</p>
            </div>
          </div>

          <button onClick={handleSimulate} disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center gap-2">
            <Activity size={18}/> {loading ? "Processando..." : "Validar Cenário"}
          </button>
        </div>
      </div>

      {/* PAINEL DE RESULTADOS */}
      <div className="w-full xl:w-2/3 flex flex-col gap-6">
        {results && (
          <>
            {/* LINHA 1: TERMÔMETRO E HEADCOUNT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Termômetro de Viabilidade */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Termômetro de Viabilidade</h3>
                <div className="flex items-center gap-6">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${results.viability.color === 'emerald' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : results.viability.color === 'amber' ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-red-500 text-red-600 bg-red-50'}`}>
                    <span className="text-2xl font-black">{results.viability.stress_index}%</span>
                  </div>
                  <div>
                    <h4 className={`text-xl font-bold mb-1 text-${results.viability.color}-600 flex items-center gap-2`}>
                      {results.viability.status === 'Confortável' ? <CheckCircle/> : <AlertTriangle/>} {results.viability.status}
                    </h4>
                    <p className="text-sm text-slate-600">Alvo Diário Misto: <b>{results.viability.target_daily.toLocaleString()} pçs</b></p>
                    <p className="text-sm text-slate-600">Recorde Histórico: <b>{results.viability.historical_max.toLocaleString()} pçs</b></p>
                  </div>
                </div>
              </div>

              {/* Análise de Headcount */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex justify-between">
                  <span>Diagnóstico de HC (Picking)</span>
                  <Users size={16}/>
                </h3>
                <div className="flex gap-4 mb-4">
                  <div className="bg-slate-50 p-3 rounded-lg flex-1 border border-slate-100 text-center">
                    <span className="block text-xs font-semibold text-slate-500">Fornecido</span>
                    <span className="text-xl font-black text-slate-800">{results.capacity.provided_hc}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg flex-1 border border-slate-100 text-center">
                    <span className="block text-xs font-semibold text-slate-500">Necessário (FR)</span>
                    <span className="text-xl font-black text-blue-600">{results.capacity.required_hc}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-md text-sm font-semibold flex items-center gap-2 ${results.capacity.diff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {results.capacity.diff >= 0 ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                  {results.capacity.diff >= 0 
                    ? `Sobram ${results.capacity.diff} HCs ou capacidade para +${(results.capacity.estimated_output - (results.viability.target_daily * (pctFracionado/100))).toLocaleString('pt-BR')} peças FR.`
                    : `Faltam ${Math.abs(results.capacity.diff)} HCs para cobrir a carga de Fracionado.`}
                </div>
              </div>
            </div>

            {/* LINHA 2: GRÁFICO DE DISTRIBUIÇÃO */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp size={16}/> Distribuição Tática (Heijunka)
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={results.distribution_plan}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="dia" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                    <Legend />
                    <Bar dataKey="volume" name="Curva de Aceleração (Peças)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                    <Line type="step" dataKey="alvo" name="Média Simples (Alvo Diário)" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LINHA 3: DIAS HISTÓRICOS SIMILARES */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <History size={16}/> Validação por Gêmeos Históricos
              </h3>
              <p className="text-xs text-slate-500 mb-4">Estes foram os 3 dias reais mais próximos do cenário projetado para as fatias de GV e Fracionado.</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {results.similar_days.map((day: any, idx: number) => (
                  <div key={idx} className="border border-slate-200 p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden bg-white hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg">Match #{idx+1}</div>
                    
                    <span className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Calendar size={18} className="text-blue-500"/> {day.data}
                    </span>
                    
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-600 flex items-center gap-1"><PackageSearch size={14} className="text-indigo-500"/> Fracionado (FR):</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{day.vol_fr.toLocaleString()} pçs</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-600 flex items-center gap-1"><PackageSearch size={14} className="text-emerald-500"/> Fechada (GV):</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{day.vol_gv.toLocaleString()} pçs</span>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                       <div className="bg-slate-50 rounded p-1">Densidade FR<br/><span className="text-sm text-slate-800">{day.densidade_fr} pçs/cx</span></div>
                       <div className="bg-slate-50 rounded p-1">Densidade GV<br/><span className="text-sm text-slate-800">{day.densidade_gv} pçs/cx</span></div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
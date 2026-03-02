import React, { useState } from 'react';
import { PlayCircle, GitMerge, TrendingDown, Info, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function HistoricalStart() {
  const [targetDate, setTargetDate] = useState('2026-02-18');
  const [startHour, setStartHour] = useState(6);
  const [endHour, setEndHour] = useState(22);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleAnalyze = async () => {
    if (startHour >= endHour) {
      alert("A hora de início deve ser menor que a hora de fim.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('http://10.47.25.234:8020/start/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          target_date: targetDate,
          start_hour: startHour,
          end_hour: endHour
        })
      });
      const data = await response.json();
      if(data.error) alert(data.error);
      else setResults(data);
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o servidor.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      
      {/* CABEÇALHO E FILTROS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <PlayCircle className="text-blue-600"/> Histórico de Indução (Start)
          </h2>
          <p className="text-sm text-slate-500">Análise de nivelamento de entrada na linha de separação.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
           <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-slate-200">
             <CalendarIcon size={16} className="text-slate-400" />
             <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none" />
           </div>

           <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-slate-200">
             <Clock size={16} className="text-slate-400" />
             <span className="text-xs font-semibold text-slate-500">Início:</span>
             <select value={startHour} onChange={e => setStartHour(Number(e.target.value))} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                {Array.from({length: 24}).map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>)}
             </select>
             <span className="text-slate-300">|</span>
             <span className="text-xs font-semibold text-slate-500">Fim:</span>
             <select value={endHour} onChange={e => setEndHour(Number(e.target.value))} className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                {Array.from({length: 24}).map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>)}
             </select>
           </div>

           <button onClick={handleAnalyze} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-bold shadow-sm transition-colors">
             {loading ? 'Processando...' : 'Analisar Cenário'}
           </button>
        </div>
      </div>

      {results && (
        <>
          {/* CARDS DE INTELIGÊNCIA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><GitMerge size={80}/></div>
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Regra de Ouro (Heijunka)</h3>
              <p className="text-sm text-slate-600 mb-4">A indução física na esteira deve obedecer à seguinte proporção de caixas:</p>
              <div className="flex items-center gap-3 text-xl font-black text-slate-800">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">{results.heijunka.ratio_reg} Caixas Reg.</span>
                <span className="text-slate-400">para cada</span>
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg">{results.heijunka.ratio_var} Caixa Var.</span>
              </div>
              <div className="text-xs text-slate-400 mt-4 font-semibold">
                Total Físico do Dia: {results.heijunka.total_reg.toLocaleString()} Cx Reg | {results.heijunka.total_var.toLocaleString()} Cx Var
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingDown size={80}/></div>
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-2">Impacto Matemático (90 Dias)</h3>
              <p className="text-sm text-slate-600 mb-4">Correlação de Pearson entre o % de caixas Varejo na linha e a perda de produtividade total:</p>
              <div className="flex items-start gap-3">
                <Info className={results.impact.value < 0 ? "text-red-500 mt-1" : "text-emerald-500 mt-1"} size={24}/>
                <span className="text-lg font-bold text-slate-700 leading-tight">
                  {results.impact.message}
                </span>
              </div>
            </div>
          </div>

          {/* GRÁFICOS DE SOBREPOSIÇÃO (DIA COMPLETO) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Volume de Peças Processadas (Real)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={results.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR') + ' peças'} />
                    <Legend />
                    <Bar dataKey="real_reg" stackId="a" name="Peças Regular" fill="#3b82f6" />
                    <Bar dataKey="real_var" stackId="a" name="Peças Varejo" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="real_total" name="Vazão Total (Peças)" stroke="#ef4444" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Alvo Heijunka (Peças Constantes)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={results.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR') + ' peças'} />
                    <Legend />
                    <Bar dataKey="ideal_reg" stackId="b" name="Alvo Regular" fill="#93c5fd" />
                    <Bar dataKey="ideal_var" stackId="b" name="Alvo Varejo" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
                    <Line type="step" dataKey="ideal_total" name="Ritmo Exigido (Peças)" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5"/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* NOVO GRÁFICO: SIMULAÇÃO DE JANELA (COMPRESSÃO) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-200 bg-purple-50/30">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-lg font-black text-purple-800 flex items-center gap-2">
                  <Clock size={20}/> Compressão de Turno ({startHour}h às {endHour}h)
                </h3>
                <p className="text-sm text-purple-600 mt-1">Se as caixas deste dia fossem injetadas apenas nesta janela, esta seria a vazão de peças necessária por hora:</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-purple-700">
                  {results.custom_window_data?.length > 0 ? results.custom_window_data[0].sim_total.toLocaleString('pt-BR') : 0} <span className="text-sm font-semibold">pçs/hora</span>
                </div>
                <div className="text-xs text-purple-500 font-bold uppercase tracking-wide">Novo Throughput Exigido</div>
              </div>
            </div>
            
            <div className="h-[300px] w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={results.custom_window_data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9d5ff" />
                  <XAxis dataKey="hour" stroke="#9333ea" />
                  <YAxis stroke="#9333ea" />
                  <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR') + ' peças'} contentStyle={{ borderRadius: '8px', border: '1px solid #d8b4fe' }} />
                  <Legend />
                  <Bar dataKey="sim_reg" stackId="c" name="Peças Regular" fill="#a855f7" />
                  <Bar dataKey="sim_var" stackId="c" name="Peças Varejo" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                  <Line type="step" dataKey="sim_total" name="Alvo Total (Peças)" stroke="#7e22ce" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { BrainCircuit, Cpu, Network, Calendar as CalendarIcon, ArrowRight, Lightbulb, Target } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ComposedChart, Line } from 'recharts';

export default function MLLab() {
  const [targetDate, setTargetDate] = useState('2026-02-18');
  const [selectedModel, setSelectedModel] = useState('heijunka');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleOptimize = async () => {
    setLoading(true);
    setResults(null);
    try {
      const response = await fetch('http://10.47.25.234:8020/ml/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_date: targetDate, model_type: selectedModel })
      });
      const data = await response.json();
      if(data.error) alert(data.error);
      else setResults(data);
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o servidor da IA.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      
      {/* HEADER E FILTRO */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BrainCircuit className="text-indigo-600"/> Laboratório de IA (Machine Learning)
          </h2>
          <p className="text-sm text-slate-500">Análise Prescritiva: Otimização de fluxos e predição de gargalos.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
           <CalendarIcon size={16} className="text-slate-400 ml-2" />
           <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 outline-none mr-2" />
        </div>
      </div>

      {/* SELEÇÃO DE MODELOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => setSelectedModel('heijunka')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${selectedModel === 'heijunka' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
        >
          <Network className={`${selectedModel === 'heijunka' ? 'text-indigo-600' : 'text-slate-400'} mb-2`} size={28}/>
          <h3 className="font-bold text-slate-800">Heijunka Global</h3>
          <p className="text-xs text-slate-500 mt-1">Matemática: Balanceamento de mix entre os 3 turnos operacionais.</p>
        </button>

        <button 
          onClick={() => setSelectedModel('saturacao')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${selectedModel === 'saturacao' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
        >
          <Cpu className={`${selectedModel === 'saturacao' ? 'text-indigo-600' : 'text-slate-400'} mb-2`} size={28}/>
          <h3 className="font-bold text-slate-800">Limiar de Saturação</h3>
          <p className="text-xs text-slate-500 mt-1">Regressão Polinomial: Descubra o limite % exato de Varejo por hora.</p>
        </button>

        <button 
          onClick={() => setSelectedModel('cluster')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${selectedModel === 'cluster' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
        >
          <Target className={`${selectedModel === 'cluster' ? 'text-indigo-600' : 'text-slate-400'} mb-2`} size={28}/>
          <h3 className="font-bold text-slate-800">Cluster de Ouro</h3>
          <p className="text-xs text-slate-500 mt-1">K-Means: Agrupe e compare este dia com os dias de alta performance.</p>
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={handleOptimize} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2">
          {loading ? 'Treinando Modelo...' : 'Rodar Algoritmo'} <ArrowRight size={18}/>
        </button>
      </div>

      {/* RESULTADOS DA IA */}
      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg border border-indigo-700 flex items-start gap-4">
            <Lightbulb className="text-yellow-400 mt-1 flex-shrink-0" size={32}/>
            <div>
              <h3 className="text-sm font-black text-indigo-300 uppercase tracking-widest mb-2">Insight da Inteligência Artificial</h3>
              <p className="text-lg leading-relaxed">{results.insight}</p>
            </div>
          </div>

          {/* RENDERIZAÇÃO CONDICIONAL POR MODELO */}
          
          {/* 1. HEIJUNKA */}
          {results.model === 'heijunka' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Cenário Original (As-Is)</h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.asis_data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="turno" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR') + ' pçs'} />
                      <Legend />
                      <Bar dataKey="real_reg" stackId="a" name="Peças Regular" fill="#94a3b8" />
                      <Bar dataKey="real_var" stackId="a" name="Peças Varejo" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-200 bg-indigo-50/30">
                <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4">Cenário Otimizado (To-Be)</h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.tobe_data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e7ff" />
                      <XAxis dataKey="turno" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR') + ' pçs'} />
                      <Legend />
                      <Bar dataKey="opt_reg" stackId="b" name="Regular Ideal" fill="#6366f1" />
                      <Bar dataKey="opt_var" stackId="b" name="Varejo Ideal" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* 2. SATURAÇÃO (Regressão) */}
          {results.model === 'saturacao' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Curva de Saturação (Regressão Polinomial)</h3>
              <p className="text-xs text-slate-400 mb-6">Cada ponto é uma hora dos últimos 90 dias. A linha vermelha mostra onde a produtividade quebra.</p>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" dataKey="pct_var" name="% de Varejo" unit="%" domain={['auto', 'auto']} />
                    <YAxis type="number" dataKey="throughput" name="Produtividade" unit=" pçs" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name="Horas Históricas" data={results.scatter_data} fill="#6366f1" opacity={0.6} />
                    <Line data={results.trend_data} type="monotone" dataKey="trend" name="Tendência (IA)" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 3. CLUSTER (K-Means) */}
          {results.model === 'cluster' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Dia Selecionado vs Cluster de Alta Performance</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.comparison_data} layout="vertical" margin={{ left: 50, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" />
                    <YAxis dataKey="metrica" type="category" width={150} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                    <Legend />
                    <Bar dataKey="Dia Selecionado" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Cluster de Ouro" fill="#fbbf24" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Simulation from './pages/Simulation'
import Scenarios from './pages/Scenarios'
import HistoricalStart from './pages/HistoricalStart'
import MLLab from './pages/MLLab' //
import { BrainCircuit } from 'lucide-react'


function App() {
  const [currentRoute, setCurrentRoute] = useState<'dashboard' | 'simulation' | 'scenarios' | 'start' | 'mllab'>('dashboard')

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-slate-800 text-white p-4 shadow-md flex flex-wrap gap-4 sticky top-0 z-50">
        <div className="font-bold text-xl mr-8">Capacity Lab</div>
        
        <button 
          className={currentRoute === 'dashboard' ? 'font-semibold text-blue-400' : 'text-slate-300 hover:text-white'}
          onClick={() => setCurrentRoute('dashboard')}
        >
          Dashboard
        </button>
        
        <button 
          className={currentRoute === 'simulation' ? 'font-semibold text-blue-400' : 'text-slate-300 hover:text-white'}
          onClick={() => setCurrentRoute('simulation')}
        >
          Simulação
        </button>

        <button 
          className={currentRoute === 'scenarios' ? 'font-semibold text-blue-400' : 'text-slate-300 hover:text-white'}
          onClick={() => setCurrentRoute('scenarios')}
        >
          Cenários
        </button>

        <button 
          className={currentRoute === 'start' ? 'font-semibold text-blue-400' : 'text-slate-300 hover:text-white'}
          onClick={() => setCurrentRoute('start')}
        >
          Histórico Start
        </button>

        <button 
          className={currentRoute === 'mllab' ? 'font-semibold text-indigo-400 flex items-center gap-1' : 'text-slate-300 hover:text-white flex items-center gap-1'}
          onClick={() => setCurrentRoute('mllab')}
        >
          <BrainCircuit size={16}/> Lab IA
        </button>

      </nav>

      {/* A MÁGICA ACONTECE AQUI */}
      <main className="flex-1">
        {/* Usamos display 'block' para a página atual e 'hidden' para as outras */}
        <div className={currentRoute === 'dashboard' ? 'block' : 'hidden'}>
          <Dashboard />
        </div>
        
        <div className={currentRoute === 'simulation' ? 'block' : 'hidden'}>
          <Simulation />
        </div>
        
        <div className={currentRoute === 'scenarios' ? 'block' : 'hidden'}>
          <Scenarios />
        </div>
        
        <div className={currentRoute === 'mllab' ? 'block' : 'hidden'}>
          <MLLab />
        </div>
        
        <div className={currentRoute === 'start' ? 'block' : 'hidden'}>
          <HistoricalStart />
        </div>
      </main>
    </div>
  )
}

export default App
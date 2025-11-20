import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter } from 'react-router-dom';
import { 
  Wallet, 
  ArrowLeftRight, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Pencil,
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Settings,
  Share2,
  Copy
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Expense, MonthlyBalance, Frequency, Payer, CategoryType, UserSettings } from './types';
import { ExpenseForm } from './components/ExpenseForm';
import { SettingsModal } from './components/SettingsModal';
import { Button } from './components/Button';
import { calculateMonthlyBalance, formatCurrency, generateProjection, getMonthKey, addMonths, getCategoryInfo } from './utils';
import { getFinancialInsights } from './services/geminiService';

const migrateExpense = (oldExpense: any): Expense => {
  let expense = { ...oldExpense };
  
  if (!expense.category) {
    expense.category = CategoryType.OTHER;
  }

  if (typeof expense.ownershipPercentage === 'number') {
    return expense as Expense;
  }
  
  let percentage = 50;
  if (expense.splitType === 'ME_ONLY') percentage = 100;
  if (expense.splitType === 'PARTNER_ONLY') percentage = 0;

  return {
    ...expense,
    ownershipPercentage: percentage
  };
};

const INITIAL_EXPENSES_RAW: any[] = [
  {
    id: '1',
    title: 'Aluguel',
    amount: 2500,
    date: '2023-10-01',
    payer: 'ME',
    category: 'HOME',
    frequency: 'MONTHLY',
    ownershipPercentage: 50
  }
];

const DEFAULT_SETTINGS: UserSettings = {
  user1Name: 'Participante 1',
  user2Name: 'Participante 2'
};

const App = () => {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('duo_expenses');
    const parsed = saved ? JSON.parse(saved) : INITIAL_EXPENSES_RAW;
    return parsed.map(migrateExpense);
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('duo_settings');
    // Migration from old keys if needed
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.userName && !parsed.user1Name) {
        return { user1Name: parsed.userName, user2Name: parsed.partnerName };
      }
      return parsed;
    }
    return DEFAULT_SETTINGS;
  });
  
  const [currentMonth, setCurrentMonth] = useState(getMonthKey(new Date()));
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  useEffect(() => {
    localStorage.setItem('duo_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('duo_settings', JSON.stringify(settings));
  }, [settings]);

  const balance: MonthlyBalance = useMemo(() => 
    calculateMonthlyBalance(expenses, currentMonth), 
    [expenses, currentMonth]
  );

  const projectionData = useMemo(() => 
    generateProjection(expenses, currentMonth, 6),
    [expenses, currentMonth]
  );

  const handleSaveExpense = (expenseData: Omit<Expense, 'id'>) => {
    if (editingExpense) {
      setExpenses(prev => prev.map(e => 
        e.id === editingExpense.id ? { ...expenseData, id: editingExpense.id } : e
      ));
    } else {
      const newExpense: Expense = {
        ...expenseData,
        id: Math.random().toString(36).substr(2, 9)
      };
      setExpenses(prev => [...prev, newExpense]);
    }
    
    setIsFormOpen(false);
    setEditingExpense(undefined);
    setAiInsight(null); 
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleNewClick = () => {
    setEditingExpense(undefined);
    setIsFormOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta despesa?')) {
      setExpenses(expenses.filter(e => e.id !== id));
      setAiInsight(null);
    }
  };

  const changeMonth = (delta: number) => {
    const [y, m] = currentMonth.split('-').map(Number);
    // Construct date at noon to avoid timezone skipping
    const date = new Date(y, m - 1, 1, 12, 0, 0);
    const newDate = addMonths(date, delta);
    setCurrentMonth(getMonthKey(newDate));
    setAiInsight(null);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setCurrentMonth(e.target.value);
      setAiInsight(null);
    }
  };
  
  const handleGenerateInsight = async () => {
    setIsLoadingAi(true);
    const insight = await getFinancialInsights(balance, expenses, settings);
    setAiInsight(insight);
    setIsLoadingAi(false);
  };

  const handleShareSummary = async () => {
    const monthName = new Date(currentMonth + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    let settlementText = "Contas zeradas.";
    if (balance.settlement > 0) {
      settlementText = `${settings.user2Name} deve R$ ${Math.abs(balance.settlement).toFixed(2)} a ${settings.user1Name}`;
    } else if (balance.settlement < 0) {
      settlementText = `${settings.user1Name} deve R$ ${Math.abs(balance.settlement).toFixed(2)} a ${settings.user2Name}`;
    }

    const lines = [
      `📊 *Resumo Quem Pagou? - ${monthName}*`,
      `-----------------------------`,
      `💰 Total Gastos: ${formatCurrency(balance.totalExpenses)}`,
      `👤 ${settings.user1Name} pagou: ${formatCurrency(balance.paidByMe)}`,
      `👤 ${settings.user2Name} pagou: ${formatCurrency(balance.paidByPartner)}`,
      `-----------------------------`,
      `👉 *Resultado: ${settlementText}*`,
      `-----------------------------`,
      `📝 *Detalhamento:*`,
      ...balance.items.map(e => {
        const payer = e.payer === Payer.ME ? settings.user1Name : settings.user2Name;
        return `- ${e.title}: ${formatCurrency(e.amount)} (${payer})`;
      })
    ];

    const text = lines.join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Resumo Financeiro - ${monthName}`,
          text: text
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Resumo copiado para a área de transferência!');
    }
  };

  let settlementTextShort = "Tudo certo! ✅";
  if (balance.settlement > 0) {
    settlementTextShort = `${settings.user2Name} deve pagar a ${settings.user1Name}`;
  } else if (balance.settlement < 0) {
    settlementTextShort = `${settings.user1Name} deve pagar a ${settings.user2Name}`;
  }

  // Date formatting for header
  const [yearStr, monthStrVal] = currentMonth.split('-');
  const dateObj = new Date(parseInt(yearStr), parseInt(monthStrVal) - 1, 1, 12, 0, 0);
  
  const longDate = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  
  // Custom format for mobile: nov/25
  const monthNameShort = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const yearShort = yearStr.slice(-2);
  const shortDate = `${monthNameShort}/${yearShort}`; 

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-950 text-slate-200 pb-20 selection:bg-indigo-500/30">
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 shrink-0 mr-2">
              <Wallet className="h-6 w-6 sm:h-8 sm:w-8" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">Quem Pagou?</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 sm:p-1 border border-slate-700 relative">
                <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-700 rounded-md transition text-slate-400 hover:text-white z-10 relative">
                  <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
                </button>
                
                <div className="relative h-8 flex items-center justify-center px-3 min-w-[80px] sm:min-w-[140px] hover:bg-slate-700/50 rounded transition-colors group select-none">
                  {/* Mobile Text */}
                  <span className="text-sm font-medium text-slate-200 sm:hidden whitespace-nowrap capitalize group-hover:text-white group-hover:underline decoration-indigo-400/50 underline-offset-2">
                    {shortDate}
                  </span>
                  {/* Desktop Text */}
                  <span className="text-sm font-medium text-slate-200 hidden sm:block capitalize whitespace-nowrap group-hover:text-white group-hover:underline decoration-indigo-400/50 underline-offset-2">
                    {longDate}
                  </span>
                  
                  <input 
                    type="month" 
                    value={currentMonth}
                    onChange={handleMonthChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    title="Alterar mês"
                  />
                </div>

                <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-700 rounded-md transition text-slate-400 hover:text-white z-10 relative">
                  <ChevronRight size={16} className="sm:w-5 sm:h-5" />
                </button>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                title="Configurações"
              >
                <Settings size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Settlement Card */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl shadow-xl border border-indigo-800/50 text-white p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 mix-blend-overlay">
                <ArrowLeftRight size={140} />
              </div>

              <div className="flex justify-between items-start relative z-10">
                <h2 className="text-indigo-200 font-medium mb-1 text-sm uppercase tracking-wider">Resultado do Mês</h2>
                <button 
                  onClick={handleShareSummary}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition text-white/80 hover:text-white"
                  title="Compartilhar Resumo"
                >
                  {navigator.share ? <Share2 size={18} /> : <Copy size={18} />}
                </button>
              </div>

              <div className="flex flex-col gap-1 mb-6 relative z-0">
                <span className="text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                  {balance.settlement === 0 
                    ? 'Zerado!' 
                    : formatCurrency(Math.abs(balance.settlement))}
                </span>
                {balance.settlement !== 0 && (
                  <span className="text-sm font-medium bg-white/10 self-start px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                    {settlementTextShort}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-indigo-500/30 relative z-0">
                <div>
                  <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider mb-1">{settings.user1Name}</p>
                  <p className="text-xs text-indigo-300/80">Pagou: <span className="text-white font-semibold">{formatCurrency(balance.paidByMe)}</span></p>
                  <p className="text-xs text-indigo-300/80">Parte Justa: {formatCurrency(balance.myFairShare)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider mb-1">{settings.user2Name}</p>
                  <p className="text-xs text-indigo-300/80">Pagou: <span className="text-white font-semibold">{formatCurrency(balance.paidByPartner)}</span></p>
                  <p className="text-xs text-indigo-300/80">Parte Justa: {formatCurrency(balance.partnerFairShare)}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 p-6 flex flex-col justify-between">
              <div>
                 <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Resumo</h3>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                      <span className="text-slate-400 text-sm">Total Gastos</span>
                      <span className="font-bold text-slate-200">{formatCurrency(balance.totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-950/50 rounded-lg border border-slate-800/50">
                      <span className="text-slate-400 text-sm">Itens</span>
                      <span className="font-bold text-slate-200">{balance.items.length}</span>
                    </div>
                 </div>
              </div>
              <Button onClick={handleNewClick} className="w-full mt-6 gap-2 shadow-xl shadow-indigo-900/20">
                <Plus size={18} /> Nova Despesa
              </Button>
            </div>
          </section>

          {/* AI Insight Section */}
          <section className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
            
            <div className="flex justify-between items-center mb-4 relative z-0">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-400" size={20} />
                <h3 className="text-lg font-semibold text-slate-100">Consultor Inteligente</h3>
              </div>
              {!aiInsight && (
                <Button variant="secondary" size="sm" onClick={handleGenerateInsight} isLoading={isLoadingAi}>
                  Gerar Análise
                </Button>
              )}
            </div>
            
            {aiInsight ? (
              <div className="prose prose-sm prose-invert max-w-none bg-amber-950/30 p-5 rounded-xl border border-amber-900/50 text-amber-100/90">
                <div dangerouslySetInnerHTML={{ __html: aiInsight.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b class="text-amber-200">$1</b>') }} />
                <div className="mt-4 text-right">
                   <button onClick={() => setAiInsight(null)} className="text-xs text-amber-400/70 hover:text-amber-300 underline transition-colors">Nova análise</button>
                </div>
              </div>
            ) : (
               <p className="text-slate-400 text-sm relative z-0">
                 Clique para analisar os gastos de {settings.user1Name} e {settings.user2Name}.
               </p>
            )}
          </section>

          {/* Charts Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
                <h3 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-400" /> Projeção de Gastos
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectionData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} tick={{fill: '#94a3b8'}} />
                      <Tooltip 
                        cursor={{ fill: '#1e293b' }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', color: '#f8fafc' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="mySpend" name={settings.user1Name} stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="partnerSpend" name={settings.user2Name} stackId="a" fill="#db2777" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
                <h3 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
                   <TrendingUp size={18} className="text-sky-400" /> Histórico Detalhado
                </h3>
                <div className="h-64 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={projectionData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                        <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', color: '#f8fafc' }}
                        />
                         <Legend iconType="plainline" wrapperStyle={{ color: '#94a3b8', fontSize: '12px', paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="total" name="Total" stroke="#0ea5e9" strokeWidth={3} dot={{r: 3}} activeDot={{r: 5}} />
                        <Line type="monotone" dataKey="mySpend" name={settings.user1Name} stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={{r: 2}} />
                        <Line type="monotone" dataKey="partnerSpend" name={settings.user2Name} stroke="#db2777" strokeWidth={2} strokeDasharray="5 5" dot={{r: 2}} />
                      </LineChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </section>

          {/* Expense List */}
          <section className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-100">Detalhamento do Mês</h3>
              <span className="text-xs text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">{balance.items.length} registros</span>
            </div>
            
            {balance.items.length === 0 ? (
               <div className="px-6 py-12 text-center text-slate-600">
                 <div className="flex flex-col items-center justify-center">
                    <div className="p-4 rounded-full bg-slate-800 mb-3">
                       <Calendar className="text-slate-600" size={24} />
                    </div>
                    <p>Nenhuma despesa registrada neste mês.</p>
                 </div>
               </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950/50 text-xs uppercase font-medium text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4 font-semibold tracking-wider">Data</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Descrição</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Quem Pagou</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Responsabilidade</th>
                        <th className="px-6 py-4 text-right font-semibold tracking-wider">Valor</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {balance.items.map((expense) => {
                        const categoryInfo = getCategoryInfo(expense.category);
                        const CategoryIcon = categoryInfo.icon;
                        const [y, m, d] = expense.date.split('-').map(Number);
                        const displayDate = new Date(y, m-1, d, 12, 0, 0);

                        return (
                          <tr key={expense.id} className="hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-500">
                              {displayDate.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-200">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-md ${categoryInfo.bg} ${categoryInfo.color}`}>
                                  <CategoryIcon size={14} />
                                </div>
                                <span className="flex flex-col">
                                  <span>{expense.title}</span>
                                  {expense.frequency === Frequency.INSTALLMENTS && (
                                    <span className="text-[10px] text-blue-400">Parcelado</span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                                expense.payer === Payer.ME 
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                                  : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                              }`}>
                                {expense.payer === Payer.ME ? settings.user1Name : settings.user2Name}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                      className="h-full bg-indigo-500" 
                                      style={{ width: `${expense.ownershipPercentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs">
                                  {expense.ownershipPercentage === 50 ? '50/50' : `${expense.ownershipPercentage}%`}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-200">
                              {formatCurrency(expense.amount)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleEditClick(expense)}
                                  className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded transition-colors"
                                  title="Editar"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-800">
                  {balance.items.map((expense) => {
                    const categoryInfo = getCategoryInfo(expense.category);
                    const CategoryIcon = categoryInfo.icon;
                    const [y, m, d] = expense.date.split('-').map(Number);
                    const displayDate = new Date(y, m-1, d, 12, 0, 0);

                    return (
                      <div key={expense.id} className="p-4 hover:bg-slate-800/30 active:bg-slate-800/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${categoryInfo.bg} ${categoryInfo.color}`}>
                              <CategoryIcon size={18} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-200">{expense.title}</p>
                              <p className="text-xs text-slate-500">
                                {displayDate.toLocaleDateString('pt-BR', {day: '2-digit', month: 'long'})}
                                {expense.frequency === Frequency.INSTALLMENTS && ' • Parcelado'}
                              </p>
                            </div>
                          </div>
                          <span className="font-semibold text-slate-200">{formatCurrency(expense.amount)}</span>
                        </div>

                        <div className="flex items-center justify-between mt-3 pl-[52px]">
                           <div className="flex items-center gap-2">
                             <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                expense.payer === Payer.ME 
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                                  : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                             }`}>
                               Pagou: {expense.payer === Payer.ME ? settings.user1Name : settings.user2Name}
                             </span>
                             <span className="text-[10px] text-slate-500">
                               Resp: {expense.ownershipPercentage === 50 ? 'Igual' : `${expense.ownershipPercentage}% ${settings.user1Name}`}
                             </span>
                           </div>

                           <div className="flex gap-3">
                              <button 
                                onClick={() => handleEditClick(expense)}
                                className="text-slate-500 hover:text-indigo-400 p-1"
                              >
                                <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-slate-500 hover:text-red-400 p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </main>

        {isFormOpen && (
          <ExpenseForm 
            initialData={editingExpense}
            user1Name={settings.user1Name}
            user2Name={settings.user2Name}
            onSave={handleSaveExpense} 
            onCancel={() => setIsFormOpen(false)} 
          />
        )}

        {isSettingsOpen && (
          <SettingsModal
            currentSettings={settings}
            onSave={(newSettings) => {
              setSettings(newSettings);
              setIsSettingsOpen(false);
            }}
            onCancel={() => setIsSettingsOpen(false)}
          />
        )}
      </div>
    </HashRouter>
  );
};

export default App;
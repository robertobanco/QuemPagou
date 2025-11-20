import React, { useState, useEffect } from 'react';
import { Expense, Frequency, Payer, CategoryType } from '../types';
import { getCategoryInfo } from '../utils';
import { Button } from './Button';
import { X } from 'lucide-react';

interface ExpenseFormProps {
  initialData?: Expense;
  user1Name: string;
  user2Name: string;
  onSave: (expense: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ 
  initialData,
  user1Name,
  user2Name,
  onSave, 
  onCancel 
}) => {
  // Helper para pegar a data local no formato YYYY-MM-DD
  const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayLocal());
  const [payer, setPayer] = useState<Payer>(Payer.ME);
  const [category, setCategory] = useState<CategoryType>(CategoryType.OTHER);
  const [frequency, setFrequency] = useState<Frequency>(Frequency.ONE_TIME);
  const [installmentsCount, setInstallmentsCount] = useState('3');
  const [ownershipPercentage, setOwnershipPercentage] = useState(50);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setAmount(initialData.amount.toString());
      setDate(initialData.date);
      setPayer(initialData.payer);
      setCategory(initialData.category || CategoryType.OTHER);
      setFrequency(initialData.frequency);
      if (initialData.installmentsCount) setInstallmentsCount(initialData.installmentsCount.toString());
      setOwnershipPercentage(initialData.ownershipPercentage);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      amount: parseFloat(amount),
      date,
      payer,
      category,
      ownershipPercentage,
      frequency,
      installmentsCount: frequency === Frequency.INSTALLMENTS ? parseInt(installmentsCount) : undefined
    });
  };

  const getPercentageLabel = (pct: number) => {
    if (pct === 50) return 'Dividir Igualmente (50/50)';
    if (pct === 100) return `100% ${user1Name}`;
    if (pct === 0) return `100% ${user2Name}`;
    return `${pct}% ${user1Name} / ${100 - pct}% ${user2Name}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-800 shrink-0">
          <h3 className="text-lg font-semibold text-white">
            {initialData ? 'Editar Despesa' : 'Nova Despesa'}
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
            <input
              type="text"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg shadow-sm py-2 px-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: Supermercado, Luz, Aluguel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg shadow-sm py-2 px-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Data</label>
              <input
                type="date"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg shadow-sm py-2 px-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 [color-scheme:dark]"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Categoria</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(CategoryType).map((cat) => {
                const info = getCategoryInfo(cat);
                const Icon = info.icon;
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                      isSelected 
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <Icon size={18} className="mb-1" />
                    <span className="text-[10px] font-medium">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payer Section */}
          <div>
             <label className="block text-sm font-medium text-slate-300 mb-1">Quem Pagou?</label>
             <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayer(Payer.ME)}
                  className={`py-2 px-4 text-sm font-medium rounded-md transition-all ${
                    payer === Payer.ME 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {user1Name}
                </button>
                <button
                  type="button"
                  onClick={() => setPayer(Payer.PARTNER)}
                  className={`py-2 px-4 text-sm font-medium rounded-md transition-all ${
                    payer === Payer.PARTNER
                      ? 'bg-pink-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {user2Name}
                </button>
             </div>
          </div>

          {/* Slider for Responsibility */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">Responsabilidade</label>
              <span className="text-xs font-semibold text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded">
                {getPercentageLabel(ownershipPercentage)}
              </span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="5"
              value={ownershipPercentage}
              onChange={(e) => setOwnershipPercentage(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
               <span>{user2Name}</span>
               <span>{user1Name}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Recorrência</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg shadow-sm py-2 px-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
              >
                <option value={Frequency.ONE_TIME}>Única</option>
                <option value={Frequency.MONTHLY}>Mensal (Fixo)</option>
                <option value={Frequency.INSTALLMENTS}>Parcelado</option>
              </select>
            </div>

            {frequency === Frequency.INSTALLMENTS && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Número de Parcelas</label>
                <input
                  type="number"
                  min="2"
                  max="120"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg shadow-sm py-2 px-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800 shrink-0">
            <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
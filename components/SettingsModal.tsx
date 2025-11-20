import React, { useState } from 'react';
import { Button } from './Button';
import { X, User, Users } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsModalProps {
  currentSettings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onCancel: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ currentSettings, onSave, onCancel }) => {
  const [user1Name, setUser1Name] = useState(currentSettings.user1Name);
  const [user2Name, setUser2Name] = useState(currentSettings.user2Name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ user1Name, user2Name });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users size={20} className="text-indigo-400"/> Participantes
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-slate-400 text-sm">Defina os nomes para que o balanço seja claro sobre quem deve a quem.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Participante 1</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-500" size={16} />
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg shadow-sm py-2 pl-10 pr-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ex: João"
                  value={user1Name}
                  onChange={(e) => setUser1Name(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Participante 2</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-500" size={16} />
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg shadow-sm py-2 pl-10 pr-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ex: Maria"
                  value={user2Name}
                  onChange={(e) => setUser2Name(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
            <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
            <Button type="submit">Salvar Nomes</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
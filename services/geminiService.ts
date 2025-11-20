import { GoogleGenAI } from "@google/genai";
import { Expense, MonthlyBalance, Payer, UserSettings, CategoryType } from '../types';

export const getFinancialInsights = async (
  currentMonth: MonthlyBalance,
  expenses: Expense[],
  settings: UserSettings
): Promise<string> => {
  try {
    // Inicializa o cliente aqui para garantir que usamos a chave mais atual (selecionada pelo usuário)
    // Isso permite que cada usuário use sua própria cota gratuita (BYOK)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';
    
    const u1 = settings.user1Name;
    const u2 = settings.user2Name;

    // Settlement logic: positive = User 2 owes User 1
    let settlementText = "";
    if (currentMonth.settlement > 0) {
      settlementText = `${u2} deve R$ ${currentMonth.settlement.toFixed(2)} para ${u1}.`;
    } else if (currentMonth.settlement < 0) {
      settlementText = `${u1} deve R$ ${Math.abs(currentMonth.settlement).toFixed(2)} para ${u2}.`;
    } else {
      settlementText = "Ninguém deve nada a ninguém. Contas zeradas.";
    }

    const expenseSummary = currentMonth.items.map(e => {
      const payerName = e.payer === Payer.ME ? u1 : u2;
      
      let splitDesc = "";
      if (e.ownershipPercentage === 50) splitDesc = "Dividido";
      else if (e.ownershipPercentage === 100) splitDesc = `Só ${u1}`;
      else if (e.ownershipPercentage === 0) splitDesc = `Só ${u2}`;
      else splitDesc = `${e.ownershipPercentage}% ${u1} / ${100 - e.ownershipPercentage}% ${u2}`;

      return `- [${e.category}] ${e.title}: R$ ${e.amount} (Pago por: ${payerName}, Resp: ${splitDesc})`;
    }).join('\n');

    const prompt = `
      Atue como um consultor financeiro objetivo para duas pessoas: ${u1} e ${u2}.
      Analise os dados financeiros deste mês:
      
      Total de Despesas: R$ ${currentMonth.totalExpenses.toFixed(2)}
      Pago por ${u1}: R$ ${currentMonth.paidByMe.toFixed(2)}
      Pago por ${u2}: R$ ${currentMonth.paidByPartner.toFixed(2)}
      Situação do Acerto: ${settlementText}
      
      Lista de Despesas:
      ${expenseSummary}
      
      Por favor, forneça:
      1. Um resumo rápido da situação entre ${u1} e ${u2}.
      2. Identifique qual categoria (Mercado, Lazer, etc) está pesando mais.
      3. Sugestão prática para o próximo mês.
      
      Mantenha a resposta concisa (máximo 3 parágrafos), imparcial e use formatação Markdown. Não assuma que são um casal romântico, trate como participantes dividindo contas.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Error fetching Gemini insights:", error);
    throw error; // Re-throw para ser tratado no componente
  }
};
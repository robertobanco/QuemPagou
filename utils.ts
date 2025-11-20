import { Expense, Frequency, MonthlyBalance, Payer, ProjectionData, CategoryType } from './types';
import { Home, ShoppingCart, Car, PartyPopper, HeartPulse, MoreHorizontal } from 'lucide-react';
import React from 'react';

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const getCategoryInfo = (type: CategoryType) => {
  switch (type) {
    case CategoryType.HOME: return { label: 'Casa', icon: Home, color: 'text-blue-400', bg: 'bg-blue-400/10' };
    case CategoryType.FOOD: return { label: 'Mercado/Alim.', icon: ShoppingCart, color: 'text-orange-400', bg: 'bg-orange-400/10' };
    case CategoryType.TRANSPORT: return { label: 'Transporte', icon: Car, color: 'text-zinc-400', bg: 'bg-zinc-400/10' };
    case CategoryType.LEISURE: return { label: 'Lazer', icon: PartyPopper, color: 'text-pink-400', bg: 'bg-pink-400/10' };
    case CategoryType.HEALTH: return { label: 'Saúde', icon: HeartPulse, color: 'text-red-400', bg: 'bg-red-400/10' };
    default: return { label: 'Outros', icon: MoreHorizontal, color: 'text-slate-400', bg: 'bg-slate-400/10' };
  }
};

export const getMonthKey = (date: Date) => {
  // Ensure we use local year and month
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

// Helper to parse YYYY-MM-DD safely without timezone shifts (sets time to 12:00)
const parseDateSafe = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

export const isExpenseInMonth = (expense: Expense, targetMonthStr: string): boolean => {
  // Parse expense date safely to avoid 'previous day' bug due to timezones
  const expenseDate = parseDateSafe(expense.date);
  
  // Target month is always YYYY-MM. Add -01T12:00 to match the safe parsing logic
  const [tYear, tMonth] = targetMonthStr.split('-').map(Number);
  const targetDate = new Date(tYear, tMonth - 1, 1, 12, 0, 0);
  
  const expenseMonthStart = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), 1, 12, 0, 0);
  const targetMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 12, 0, 0);

  if (expense.frequency === Frequency.ONE_TIME) {
    return expenseMonthStart.getTime() === targetMonthStart.getTime();
  }

  if (expense.frequency === Frequency.MONTHLY) {
    return targetMonthStart.getTime() >= expenseMonthStart.getTime();
  }

  if (expense.frequency === Frequency.INSTALLMENTS && expense.installmentsCount) {
    const endDate = addMonths(expenseMonthStart, expense.installmentsCount);
    return targetMonthStart.getTime() >= expenseMonthStart.getTime() && targetMonthStart.getTime() < endDate.getTime();
  }

  return false;
};

export const calculateMonthlyBalance = (expenses: Expense[], monthStr: string): MonthlyBalance => {
  const activeExpenses = expenses.filter(e => isExpenseInMonth(e, monthStr));
  
  let totalExpenses = 0;
  let paidByMe = 0;
  let paidByPartner = 0;
  let myFairShare = 0;
  let partnerFairShare = 0;

  activeExpenses.forEach(expense => {
    totalExpenses += expense.amount;

    if (expense.payer === Payer.ME) {
      paidByMe += expense.amount;
    } else {
      paidByPartner += expense.amount;
    }

    // ownershipPercentage is "User 1 Share". 
    const myShareAmount = expense.amount * (expense.ownershipPercentage / 100);
    const partnerShareAmount = expense.amount - myShareAmount;

    myFairShare += myShareAmount;
    partnerFairShare += partnerShareAmount;
  });

  // Settlement Logic:
  // Balance = (What User 1 Paid) - (What User 1 SHOULD have paid)
  // If positive, User 1 paid extra -> User 2 owes User 1.
  // If negative, User 1 paid less -> User 1 owes User 2.
  const myBalance = paidByMe - myFairShare;

  return {
    month: monthStr,
    totalExpenses,
    paidByMe,
    paidByPartner,
    myFairShare,
    partnerFairShare,
    settlement: myBalance, 
    items: activeExpenses
  };
};

export const generateProjection = (expenses: Expense[], startMonthStr: string, monthsAhead: number = 6): ProjectionData[] => {
  const data: ProjectionData[] = [];
  const [y, m] = startMonthStr.split('-').map(Number);
  const startDate = new Date(y, m - 1, 1, 12, 0, 0);

  for (let i = 0; i < monthsAhead; i++) {
    const currentMonthDate = addMonths(startDate, i);
    const monthKey = getMonthKey(currentMonthDate);
    const balance = calculateMonthlyBalance(expenses, monthKey);
    
    const monthLabel = currentMonthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    
    data.push({
      month: monthLabel,
      mySpend: balance.myFairShare,
      partnerSpend: balance.partnerFairShare,
      total: balance.totalExpenses
    });
  }

  return data;
};
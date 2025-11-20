export enum Payer {
  ME = 'ME', // Agora representa User 1
  PARTNER = 'PARTNER' // Agora representa User 2
}

export enum CategoryType {
  HOME = 'HOME',
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  LEISURE = 'LEISURE',
  HEALTH = 'HEALTH',
  OTHER = 'OTHER'
}

export enum Frequency {
  ONE_TIME = 'ONE_TIME',
  MONTHLY = 'MONTHLY',    
  INSTALLMENTS = 'INSTALLMENTS' 
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string; 
  payer: Payer;
  category: CategoryType; // Novo campo
  ownershipPercentage: number; 
  frequency: Frequency;
  installmentsCount?: number; 
}

export interface MonthlyBalance {
  month: string; 
  totalExpenses: number;
  paidByMe: number; // Pago pelo User 1
  paidByPartner: number; // Pago pelo User 2
  myFairShare: number;
  partnerFairShare: number;
  settlement: number; 
  items: Expense[];
}

export interface ProjectionData {
  month: string;
  mySpend: number;
  partnerSpend: number;
  total: number;
}

export interface UserSettings {
  user1Name: string; // Antes userName
  user2Name: string; // Antes partnerName
}

// Fix: Removed conflicting global declaration for window.aistudio as it is already defined with type AIStudio in the environment.

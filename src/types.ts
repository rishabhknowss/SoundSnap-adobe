export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  credits: number;
  emailVerified: boolean;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  displayPrice: string;
  perCredit: string;
}

export interface Transaction {
  id: string;
  type: string;
  credits_amount: number;
  amount_paid: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface GeneratedVideo {
  url: string;
  prompt: string;
  creditsRemaining: number;
}

export type Executive = {
  id: number;
  name: string;
  phone: string;
  area: string;
  vehicle?: string;
  status?: string;
  cases?: number;
  agent_code?: string | null;
  is_online?: boolean | null;
  last_seen?: string | null;
};

export type MyCase = {
  id: number;
  customer: string;
  phone: string;
  bank: string;
  amount: number;
  pendingAmount: number;
  address: string;
  accountNo: string;
  branchName: string;
  schemeCode: string;
  accountSegment: string;
  assetClassification: string;
  sanctionLimit: number;
  customerBalance: number;
  assigned_agent?: number | string | null;
  status: "Pending" | "Visited" | "Paid" | "Overdue";
};

export type VisitRecord = {
  id: number;
  executive: string;
  customer: string;
  area: string;
  status: string;
  latitude: string;
  longitude: string;
  remarks: string;
  photo?: string;
  time: string;
};
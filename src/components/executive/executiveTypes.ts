export type Executive = {
  id: number;
  name: string;
  phone: string;
  area: string;
  vehicle?: string;
  status?: string;
  cases?: number;
};

export type MyCase = {
  id: number;
  customer: string;
  phone: string;
  bank: string;
  amount: number;
  assigned_agent?: string;
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
export type PublicBookingBranch = {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
};

export type PublicBookingService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  categoryName: string | null;
};

export type PublicBookingEmployee = {
  id: string;
  branchId: string;
  name: string;
  color: string;
  serviceIds: string[];
};

export type PublicBookingCatalog = {
  company: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
  };
  branches: PublicBookingBranch[];
  services: PublicBookingService[];
  employees: PublicBookingEmployee[];
};

export type PublicBookingSlot = {
  time: string;
  employeeId: string;
  employeeName: string;
};

export type PublicBookingConfirmation = {
  reference: string;
  branchName: string;
  employeeName: string;
  date: string;
  time: string;
  durationMinutes: number;
  totalCents: number;
  currency: string;
  serviceNames: string[];
};

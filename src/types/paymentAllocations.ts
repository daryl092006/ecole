export interface AllocationTarget { installmentId: string; amount: number; }
export interface AllocationInstallment {
  id: string; enrollmentId: string; versionId: string;
  description: string; dueOn: string; amount: number; settled: number;
}
export interface AllocatablePayment {
  id: string; enrollmentId: string; reference: string;
  amount: number; available: number; allocated: number; unallocated: number;
  pending: boolean; cancelled: boolean;
  allocations: AllocationTarget[];
}
export interface PaymentAllocationDirectory {
  payments: AllocatablePayment[];
  installments: AllocationInstallment[];
}

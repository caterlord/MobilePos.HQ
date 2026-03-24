export interface Department {
  departmentId: number;
  accountId: number;
  departmentName: string;
  departmentCode?: string;
  enabled: boolean;
}

export interface DepartmentSummary {
  departmentId: number;
  accountId: number;
  departmentCode?: string | null;
  departmentName: string;
  description?: string | null;
  revenueCenterCode?: string | null;
  isSubDepartment?: boolean | null;
  parentDepartmentId?: number | null;
  enabled: boolean;
  modifiedDate: string;
  modifiedBy: string;
}

export interface UpsertDepartmentPayload {
  departmentCode?: string | null;
  departmentName: string;
  description?: string | null;
  revenueCenterCode?: string | null;
  isSubDepartment?: boolean | null;
  parentDepartmentId?: number | null;
}

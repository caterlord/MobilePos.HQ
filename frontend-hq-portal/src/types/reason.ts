export interface ReasonSummary {
  reasonId: number;
  accountId: number;
  reasonGroupCode: string;
  reasonCode: string;
  reasonDesc: string;
  enabled: boolean;
  isSystemReason?: boolean | null;
  modifiedDate: string;
  modifiedBy: string;
}

export interface UpsertReasonPayload {
  reasonGroupCode: string;
  reasonCode: string;
  reasonDesc: string;
}

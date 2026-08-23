export interface TrainingRecordDto {
  id: string;
  staffId: string;
  title: string;
  provider: string;
  completedDate: string;
  certificateUrl: string | null;
  hoursOrCredits: number | null;
  loggedByStaffId: string;
  createdAt: string;
}

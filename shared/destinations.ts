import { z } from 'zod';
export const RepairDestinationSchema = z
  .object({
    padId: z.string().min(1).max(80),
    buttonId: z.string().min(1).max(80),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export type PathAction = 'file' | 'folder' | 'app';
export type DestinationStatus =
  'available' | 'missing' | 'denied' | 'foreign' | 'wrong-type' | 'unavailable' | 'not-checked';
export type DestinationIssue = {
  padId: string;
  buttonId: string;
  padName: string;
  buttonName: string;
  type: PathAction;
  target: string;
  local: boolean;
  conflicted: boolean;
  status: Exclude<DestinationStatus, 'available'>;
};
export type DestinationReport = {
  revision: number;
  total: number;
  available: number;
  issues: DestinationIssue[];
};
export const destinationMessages: Record<DestinationStatus, string> = {
  available: 'Available',
  missing: 'Not found',
  denied: 'Access denied',
  foreign: 'Path for another operating system',
  'wrong-type': 'Wrong destination type',
  unavailable: 'Unavailable or check timed out',
  'not-checked': 'Not checked — try again',
};

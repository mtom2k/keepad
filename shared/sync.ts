import { z } from 'zod';
import { PadSchema } from './model.js';
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const id = z.string().min(1).max(80);
export const TargetUpdateSchema = z.object({
  padId: id,
  buttonId: id,
  target: z.string().min(1).max(20000).nullable(),
});
export type TargetUpdate = z.infer<typeof TargetUpdateSchema>;
export const ChangeBodySchema = z
  .object({
    format: z.literal(1),
    nonce: z.uuid(),
    device: z.uuid(),
    platform: z.enum(['darwin', 'win32', 'linux']),
    created: z.iso.datetime(),
    padId: id,
    order: z.number().int().min(0).max(30),
    parents: z.array(hash).max(2000),
    pad: PadSchema.nullable(),
  })
  .strict()
  .refine(
    (change) => !change.pad || change.pad.id === change.padId,
    'Pad identity does not match.',
  );
export const ChangeSchema = z.object({ id: hash, body: ChangeBodySchema }).strict();
export type Change = z.infer<typeof ChangeSchema>;
export const DeviceSchema = z.object({
  version: z.literal(1),
  id: z.uuid(),
  folder: z.string().min(1).max(20000).optional(),
  heads: z.array(z.object({ padId: id, ids: z.array(hash).max(2000) })).max(2000),
  pending: z.array(ChangeSchema).max(2000),
  targets: z
    .array(
      z.object({
        padId: id,
        buttonId: id,
        type: z.enum(['file', 'folder', 'app']),
        original: z.string().max(20000),
        target: z.string().min(1).max(20000),
      }),
    )
    .max(600),
});
export type Device = z.infer<typeof DeviceSchema>;
export type SyncConflict = {
  padId: string;
  versions: {
    id: string;
    name: string;
    deleted: boolean;
    buttons: number;
    platform: string;
    created: string;
  }[];
};
export type SyncStatus = {
  folder?: string;
  pending: number;
  error?: string;
  checked?: string;
  conflicts: SyncConflict[];
};
export type SyncChoice = { token: string; folder: string; existing: boolean; pads: number };

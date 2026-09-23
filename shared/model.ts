import { z } from 'zod';
export const themes = ['paper', 'graphite', 'sage', 'sand', 'midnight', 'contrast'] as const;
export const appThemes = ['light', 'dark', 'system'] as const;
export const icons = [
  'globe',
  'folder',
  'file',
  'app',
  'copy',
  'mail',
  'music',
  'code',
  'calendar',
  'camera',
  'pen',
  'coffee',
  'book',
  'terminal',
  'heart',
  'video',
  'download',
  'message',
  'grid',
  'search',
] as const;
export const padIcons = ['none', ...icons] as const;
export const colors = ['green', 'blue', 'orange', 'purple', 'rose', 'neutral'] as const;
export const actionTypes = ['url', 'file', 'folder', 'app', 'text'] as const;
export const actionNames = {
  url: 'Open website',
  file: 'Open file',
  folder: 'Open folder',
  app: 'Open application',
  text: 'Copy text',
};
const id = z.string().min(1).max(80);
export const ButtonSchema = z
  .object({
    id,
    label: z.string().trim().min(1, 'Give this button a name.').max(40),
    description: z.string().max(180).default(''),
    type: z.enum(actionTypes),
    target: z.string().min(1, 'Choose a destination for this action.').max(20000),
    icon: z.enum(icons),
    color: z.enum(colors),
    image: z
      .string()
      .max(1500000)
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
      .optional(),
    slot: z.number().int().min(0).max(19),
  })
  .superRefine((b, ctx) => {
    if (b.type === 'url') {
      try {
        const u = new URL(b.target);
        if (!['https:', 'http:'].includes(u.protocol) || !u.hostname) throw Error();
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['target'],
          message: 'Enter a complete http:// or https:// website address.',
        });
      }
    }
    if (
      ['file', 'folder', 'app'].includes(b.type) &&
      (!/^(\/|[a-zA-Z]:[\\/]|\\\\)/.test(b.target) || b.target.includes('\0'))
    )
      ctx.addIssue({
        code: 'custom',
        path: ['target'],
        message: 'Choose an absolute file or folder path.',
      });
  });
export const PadSchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(32),
    description: z.string().max(100),
    icon: z.enum(padIcons),
    theme: z.enum(themes),
    columns: z.number().int().min(3).max(5),
    rows: z.number().int().min(2).max(4),
    buttons: z.array(ButtonSchema).max(20),
  })
  .superRefine((p, ctx) => {
    if (
      new Set(p.buttons.map((b) => b.slot)).size !== p.buttons.length ||
      new Set(p.buttons.map((b) => b.id)).size !== p.buttons.length
    )
      ctx.addIssue({ code: 'custom', message: 'Buttons must have unique positions and IDs.' });
    if (p.buttons.some((b) => b.slot >= p.columns * p.rows))
      ctx.addIssue({
        code: 'custom',
        message: 'This layout is too small for its buttons. Remove or move them first.',
      });
  });
export const StateSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    activePadId: id,
    pads: z.array(PadSchema).min(1).max(30),
    settings: z.object({
      theme: z.enum(appThemes).default('system'),
      shortcut: z.string().min(1).max(100),
      hideAfterAction: z.boolean(),
      launchAtLogin: z.boolean(),
    }),
  })
  .superRefine((s, ctx) => {
    if (
      !s.pads.some((p) => p.id === s.activePadId) ||
      new Set(s.pads.map((p) => p.id)).size !== s.pads.length
    )
      ctx.addIssue({ code: 'custom', message: 'Select an existing pad with a unique ID.' });
  });
export type MacroButton = z.infer<typeof ButtonSchema>;
export type Pad = z.infer<typeof PadSchema>;
export type State = z.infer<typeof StateSchema>;
export type Info = {
  platform: string;
  version: string;
  shortcutRegistered: boolean;
  storageWarning?: string;
  desktop: boolean;
  packaged: boolean;
};
export type Snapshot = { state: State; info: Info; launcherPadId?: string };
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export interface KeePadAPI {
  load(): Promise<Result<Snapshot>>;
  save(state: State): Promise<Result<Snapshot>>;
  run(padId: string, buttonId: string): Promise<Result<string>>;
  pickPath(type: string): Promise<Result<string | null>>;
  pickImage(): Promise<Result<string | null>>;
  showEditor(page?: string): Promise<Result<void>>;
  showLauncher(padId?: string): Promise<Result<void>>;
  hide(): Promise<Result<void>>;
  exportPads(): Promise<Result<boolean>>;
  importPads(): Promise<Result<Snapshot | null>>;
  onLauncherShown(callback: () => void): () => void;
  onChange(callback: (snapshot: Snapshot) => void): () => void;
}
export function makeDefaultState(paths?: {
  home: string;
  downloads: string;
  documents: string;
}): State {
  const button = (
    slot: number,
    label: string,
    type: MacroButton['type'],
    target: string,
    icon: MacroButton['icon'],
    color: MacroButton['color'],
    description: string,
  ): MacroButton => ({
    id: `everyday-${slot}`,
    slot,
    label,
    type,
    target,
    icon,
    color,
    description,
  });
  const buttons: MacroButton[] = [
    button(0, 'Gmail', 'url', 'https://mail.google.com', 'mail', 'rose', 'A little inbox time.'),
    button(
      1,
      'Calendar',
      'url',
      'https://calendar.google.com',
      'calendar',
      'blue',
      'See what’s on your day.',
    ),
    button(
      2,
      'Notion',
      'url',
      'https://www.notion.so',
      'book',
      'neutral',
      'Make room for your next idea.',
    ),
    button(
      3,
      'Spotify',
      'url',
      'https://open.spotify.com',
      'music',
      'green',
      'Find your focus soundtrack.',
    ),
    button(
      4,
      'Downloads',
      paths ? 'folder' : 'url',
      paths?.downloads ?? 'https://drive.google.com',
      'download',
      'orange',
      paths ? 'Open your Downloads folder.' : 'Open Google Drive.',
    ),
    button(
      5,
      'GitHub',
      'url',
      'https://github.com',
      'code',
      'purple',
      'Pick up where you left off.',
    ),
    button(
      6,
      'YouTube',
      'url',
      'https://www.youtube.com',
      'video',
      'rose',
      'Something worth watching.',
    ),
    button(
      7,
      'Quick reply',
      'text',
      'Thanks for sharing! I’ll take a look and get back to you.',
      'message',
      'blue',
      'Copy a friendly reply to your clipboard.',
    ),
  ];
  return {
    schemaVersion: 1,
    revision: 0,
    activePadId: 'everyday',
    pads: [
      {
        id: 'everyday',
        name: 'Everyday',
        description: 'A little less clicking. A little more doing.',
        icon: 'coffee',
        theme: 'paper',
        columns: 4,
        rows: 3,
        buttons,
      },
      {
        id: 'focus',
        name: 'Deep work',
        description: 'Clear a little space to focus.',
        icon: 'book',
        theme: 'sage',
        columns: 3,
        rows: 2,
        buttons: [
          {
            ...button(
              0,
              'Read later',
              'url',
              'https://www.wikipedia.org',
              'book',
              'green',
              'Follow your curiosity.',
            ),
            id: 'focus-read',
          },
          {
            ...button(
              1,
              'Focus music',
              'url',
              'https://open.spotify.com',
              'music',
              'neutral',
              'Settle into your work.',
            ),
            id: 'focus-music',
          },
        ],
      },
      {
        id: 'creative',
        name: 'Creative space',
        description: 'Good ideas start somewhere.',
        icon: 'pen',
        theme: 'sand',
        columns: 4,
        rows: 2,
        buttons: [
          {
            ...button(
              0,
              'Figma',
              'url',
              'https://www.figma.com',
              'pen',
              'purple',
              'Open your design workspace.',
            ),
            id: 'creative-figma',
          },
        ],
      },
    ],
    settings: {
      theme: 'system',
      shortcut: 'CommandOrControl+Shift+Space',
      hideAfterAction: true,
      launchAtLogin: false,
    },
  };
}
export function mergeImported(current: State, imported: unknown, newId: () => string): State {
  const source = StateSchema.parse(imported);
  return StateSchema.parse({
    ...current,
    pads: [
      ...current.pads,
      ...source.pads.map((p) => ({
        ...p,
        id: newId(),
        name: `${p.name.slice(0, 23)} (imported)`,
        buttons: p.buttons.map((b) => ({ ...b, id: newId() })),
      })),
    ],
  });
}

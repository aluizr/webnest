import { z } from "zod";

export const linkSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
  favicon: z.string().optional(),
  status: z.enum(["backlog", "in_progress", "done"]).optional().default("backlog"),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  dueDate: z.string().optional().nullable(),
});
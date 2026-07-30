import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name must be at least 2 characters").max(80, "Project name must be 80 characters or fewer"),
  description: z.string().trim().max(500, "Description must be 500 characters or fewer"),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

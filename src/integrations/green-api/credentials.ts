import { z } from "zod";

export const credentialsSchema = z.object({
  apiUrl: z.url().refine((value) => new URL(value).protocol === "https:"),
  instanceId: z.string().trim().min(1),
  apiToken: z.string().trim().min(1),
});
export type GreenApiCredentials = z.infer<typeof credentialsSchema>;

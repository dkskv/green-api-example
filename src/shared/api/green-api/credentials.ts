import { z } from "zod";

export const greenApiCredentialsSchema = z.object({
  apiUrl: z
    .string()
    .trim()
    .pipe(z.url({ protocol: /^https$/ }))
    .transform((value) => new URL(value).origin),
  instanceId: z.string().trim().min(1),
  apiToken: z.string().trim().min(1),
});

export type GreenApiCredentials = z.infer<typeof greenApiCredentialsSchema>;

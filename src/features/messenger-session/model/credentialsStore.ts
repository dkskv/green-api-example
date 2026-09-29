import { boundMethod } from "@/shared/lib/decorators/boundMethod";
import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { type GreenApiCredentials } from "@/integrations/green-api";

const credentialsSchema = z.object({
  credentials: z
    .object({
      apiUrl: z.url().refine((value) => new URL(value).protocol === "https:"),
      instanceId: z.string().trim().min(1),
      apiToken: z.string().trim().min(1),
    })
    .nullable(),
});

type VerificationResult =
  { status: "success" } | { status: "error"; error: unknown };

type CredentialsState = {
  credentials: GreenApiCredentials | null;
  verification: VerificationResult | null;
};

type PersistedCredentials = Pick<CredentialsState, "credentials">;

export class CredentialsStore {
  readonly state = createStore<CredentialsState>()(
    persist(
      (): CredentialsState => ({
        credentials: null,
        verification: null,
      }),
      {
        name: "green-api-credentials",
        storage: createJSONStorage<PersistedCredentials>(() => localStorage),
        partialize: ({ credentials }) => ({ credentials }),
        merge: (saved, current) => ({
          ...current,
          credentials:
            credentialsSchema.safeParse(saved).data?.credentials ?? null,
          verification: null,
        }),
      },
    ),
  );

  @boundMethod
  save(credentials: GreenApiCredentials): void {
    this.state.setState({
      credentials,
      verification: { status: "success" },
    });
  }

  @boundMethod
  clear(): void {
    this.state.setState({
      credentials: null,
      verification: null,
    });

    this.state.persist.clearStorage();
  }

  @boundMethod
  setVerification(
    credentials: GreenApiCredentials,
    result: VerificationResult,
  ): void {
    if (this.state.getState().credentials !== credentials) return;

    this.state.setState({
      verification: result,
    });
  }
}

export const credentialsStore = new CredentialsStore();

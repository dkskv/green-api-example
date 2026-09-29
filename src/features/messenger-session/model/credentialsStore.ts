import { boundMethod } from "@/shared/lib/decorators/boundMethod";
import type { DisplayText } from "@/shared/i18n/text";
import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { type GreenApiCredentials } from "@/integrations/green-api";
import { createSessionStorage } from "./sessionStorage";

const credentialsSchema = z.object({
  credentials: z
    .object({
      apiUrl: z.url().refine((value) => new URL(value).protocol === "https:"),
      instanceId: z.string().trim().min(1),
      apiToken: z.string().trim().min(1),
    })
    .nullable(),
});

type CredentialsState = {
  credentials: GreenApiCredentials | null;
  verified: boolean;
  sessionErrorMessage: DisplayText;
};

type PersistedCredentials = Pick<CredentialsState, "credentials">;

export class CredentialsStore {
  readonly state = createStore<CredentialsState>()(
    persist(
      (): CredentialsState => ({
        credentials: null,
        verified: false,
        sessionErrorMessage: "",
      }),
      {
        name: "green-api-credentials",
        storage: createSessionStorage<PersistedCredentials>("credentials"),
        partialize: ({ credentials }) => ({ credentials }),
        merge: (saved, current) => ({
          ...current,
          credentials:
            credentialsSchema.safeParse(saved).data?.credentials ?? null,
          verified: false,
          sessionErrorMessage: "",
        }),
      },
    ),
  );

  @boundMethod
  save(credentials: GreenApiCredentials): void {
    this.state.setState({
      credentials,
      verified: true,
      sessionErrorMessage: "",
    });
  }

  @boundMethod
  clear(): void {
    this.state.setState({
      credentials: null,
      verified: false,
      sessionErrorMessage: "",
    });

    this.state.persist.clearStorage();
  }

  @boundMethod
  setVerification(
    credentials: GreenApiCredentials,
    errorMessage: DisplayText = "",
  ): void {
    if (this.state.getState().credentials !== credentials) return;

    this.state.setState({
      verified: !errorMessage,
      sessionErrorMessage: errorMessage,
    });
  }
}

export const credentialsStore = new CredentialsStore();

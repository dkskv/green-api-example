import { boundMethod } from "@/shared/lib/decorators/boundMethod";
import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { normalizePhoneNumber, type VerifiedContact } from "@/entities/contact";
import { createSessionStorage } from "./sessionStorage";

const contactSchema = z.object({
  contact: z
    .object({
      phone: z
        .string()
        .refine((phone) => normalizePhoneNumber(phone) === phone),
      chatId: z.string().min(1),
    })
    .nullable(),
});

type ContactState = { contact: VerifiedContact | null };

export class ActiveContactStore {
  readonly state = createStore<ContactState>()(
    persist((): ContactState => ({ contact: null }), {
      name: "green-api-active-chat",
      storage: createSessionStorage<ContactState>("contact"),
      partialize: ({ contact }) => ({ contact }),
      merge: (saved, current) => ({
        ...current,
        contact: contactSchema.safeParse(saved).data?.contact ?? null,
      }),
    }),
  );

  @boundMethod
  save(contact: VerifiedContact): void {
    this.state.setState({ contact });
  }

  @boundMethod
  clear(): void {
    this.state.setState({ contact: null });
    this.state.persist.clearStorage();
  }
}

export const contactStore = new ActiveContactStore();

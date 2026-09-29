import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { contactStore, credentialsStore } from "@/features/session";
import App from "@/app/ui/App.tsx";

credentialsStore.restore();
contactStore.restore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

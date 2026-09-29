// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { contactStore, credentialsStore } from "@/features/messenger-session";
import { App } from "@/app";

credentialsStore.restore();
contactStore.restore();

createRoot(document.getElementById("root")!).render(
  <App />,
  // <StrictMode >
  //   <App />
  // </StrictMode>,
);

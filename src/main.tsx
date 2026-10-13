import ErrorBoundary from "@/components/common/ErrorBoundary";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { loadClients } from "@/lib/clients";
import "./i18n";

const render = () =>
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );

// Client metadata is needed synchronously everywhere; it is a single local IPC call.
loadClients()
  .catch(error => console.error("Failed to load clients:", error))
  .finally(render);

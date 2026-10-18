import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { PrefsProvider } from "./context/PrefsProvider";
import { ToastProvider } from "./context/ToastProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <PrefsProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </PrefsProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
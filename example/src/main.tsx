import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Theme accentColor="indigo" grayColor="slate" radius="medium" scaling="100%" appearance="light">
      <App />
    </Theme>
  </StrictMode>
);

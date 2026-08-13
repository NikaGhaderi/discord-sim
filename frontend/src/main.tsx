import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "@app/App";
import { applyStoredPaletteIfAny } from "@shared/theme/applyPalette";
import "./index.css";

applyStoredPaletteIfAny();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

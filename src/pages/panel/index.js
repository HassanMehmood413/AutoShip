import React from "react";
import { createRoot } from "react-dom/client";
import Panel from "./Panel";

const container = document.querySelector("#app-panel");
const root = createRoot(container);
root.render(<Panel />);

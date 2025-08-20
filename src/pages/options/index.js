import React from "react";
import { createRoot } from "react-dom/client";
import Options from "./Options";

const container = document.querySelector("#app-options");
const root = createRoot(container);
root.render(<Options />);

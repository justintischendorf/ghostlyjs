import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// The repo logo, shared with the README (no copy in public/).
import logo from "../../../assets/logo.svg";
import App from "./app";

// The logo as favicon. Set here, because index.html can't import files from
// outside this app.
const icon = document.createElement("link");
icon.rel = "icon";
icon.href = logo;
document.head.append(icon);

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

// `createRoot` from React 18 (React 17 used `ReactDOM.render`).
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

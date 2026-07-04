import { createRoot } from "react-dom/client";
import Clarity from "@microsoft/clarity";
import App from "./App.tsx";
import "./index.css";

Clarity.init("xen9f4xfx0");

createRoot(document.getElementById("root")!).render(<App />);

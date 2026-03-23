import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Error tracking for debugging black screen
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Global Error:", message, "at", source, lineno, colno, error);
};

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("No root element found!");
}

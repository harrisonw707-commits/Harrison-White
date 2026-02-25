
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';

console.log("HireQuest AI: Initializing application...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("HireQuest AI: Root element not found!");
  throw new Error("Could not find root element to mount to");
}

console.log("HireQuest AI: Mounting React application...");
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log("HireQuest AI: Application mounted.");

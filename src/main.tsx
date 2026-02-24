
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';

console.log("Envision Paths: Initializing application...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Envision Paths: Root element not found!");
  throw new Error("Could not find root element to mount to");
}

console.log("Envision Paths: Mounting React application...");
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log("Envision Paths: Application mounted.");

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={400}><App /></TooltipProvider>
    <Toaster />
  </React.StrictMode>
);

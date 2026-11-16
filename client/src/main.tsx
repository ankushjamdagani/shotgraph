import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={400}><App /></TooltipProvider>
    <Toaster position="bottom-right" closeButton visibleToasts={3} offset={24} mobileOffset={16} toastOptions={{ style: { background: 'var(--bg-surface)', color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' } }} />
  </React.StrictMode>
);

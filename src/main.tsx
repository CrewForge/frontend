import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App.tsx';
import './index.css';
import './styles/page-polish.css';
import './styles/hljs-tokyo-night.css';

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Toaster position="bottom-right" richColors closeButton />
  </>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import App from './App';

const queryClient = new QueryClient();
const theme = createTheme({
  palette: {
    primary: { main: '#3f51b5' },
    background: { default: '#f5f6fa' },
  },
});

// Punto de entrada: AuthProvider + rutas protegidas por rol viven en App.tsx (Fase 11).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

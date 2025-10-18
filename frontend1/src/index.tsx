import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Ton ThemeContext custom
import { ThemeProvider as CustomThemeProvider } from './context/ThemeContext';

// MUI ThemeProvider
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";

// HelmetProvider pour react-helmet-async
import { HelmetProvider } from "react-helmet-async";

// Optionnel : thème MUI
const muiTheme = createTheme({
  palette: {
    mode: 'light', // ou "dark", tu peux le lier à ton ThemeContext si tu veux
  },
});

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <CustomThemeProvider>
        <MuiThemeProvider theme={muiTheme}>
          <App />
        </MuiThemeProvider>
      </CustomThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);

reportWebVitals();

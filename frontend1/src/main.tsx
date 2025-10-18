import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App";
import { AppWrapper } from "./components/common/PageMeta";

// Ton ThemeContext custom
import { ThemeProvider as CustomThemeProvider } from "./context/ThemeContext";

// MUI ThemeProvider
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";

// React Helmet Async
import { HelmetProvider } from "react-helmet-async";

// Optionnel : créer un thème MUI
const muiTheme = createTheme({
  palette: {
    mode: "light", // ou "dark"
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <CustomThemeProvider>
        <MuiThemeProvider theme={muiTheme}>
          <AppWrapper>
            <App />
          </AppWrapper>
        </MuiThemeProvider>
      </CustomThemeProvider>
    </HelmetProvider>
  </StrictMode>
);

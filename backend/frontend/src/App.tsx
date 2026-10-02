import { BrowserRouter as Router, Routes, Route } from "react-router";

import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Utilisateurs from "./pages/Utilisateurs";
import FamillesProfiles from "./pages/FamillesProfiles";
import EtudesProfile from "./pages/EtudesProfile";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import ListeEvents from "./pages/ListeEvents";
import EventDetails from "./pages/EventDetails";
import DegreFamillePage from "./pages/DegreFamillePage";
import GestionEconomique from "./pages/GestionEconomique";
import Parrains from "./pages/Parrains";
import ParrainProfile from "./pages/ParrainProfile";
import BasicTables from "./pages/Tables/BasicTables";
import SuiviEtudes from "./pages/Tables/SuiviEtudes";
import AjoutFamille from "./pages/Forms/AjoutFamille";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProtectedRoute from "./components/auth/ProtectedRoute";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />

        <Routes>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>

              <Route
                index
                path="/home"
                element={<Home />}
              />

              <Route
                path="/gestion-economique"
                element={<GestionEconomique />}
              />

              <Route
                path="/profile"
                element={<UserProfiles />}
              />

              <Route
                path="/utilisateurs"
                element={<Utilisateurs />}
              />

              <Route
                path="/familleprofile/:familleId"
                element={<FamillesProfiles />}
              />

              <Route
                path="/degre-famille"
                element={<DegreFamillePage />}
              />

              <Route
                path="/parrains"
                element={<Parrains />}
              />

              <Route
                path="/parrains/:id"
                element={<ParrainProfile />}
              />

              <Route
                path="/EtudesProfile/:enfantid"
                element={<EtudesProfile />}
              />

              <Route
                path="/calendar"
                element={<Calendar />}
              />

              <Route
                path="/listeevents"
                element={<ListeEvents />}
              />

              <Route
                path="/event-details/:id"
                element={<EventDetails />}
              />

              <Route
                path="/blank"
                element={<Blank />}
              />

              <Route
                path="/form-elements"
                element={<AjoutFamille />}
              />

              <Route
                path="/basic-tables"
                element={<BasicTables />}
              />

              <Route
                path="/suivi-etudes"
                element={<SuiviEtudes />}
              />

              <Route
                path="/alerts"
                element={<Alerts />}
              />

              <Route
                path="/avatars"
                element={<Avatars />}
              />

              <Route
                path="/badge"
                element={<Badges />}
              />

              <Route
                path="/buttons"
                element={<Buttons />}
              />

              <Route
                path="/images"
                element={<Images />}
              />

              <Route
                path="/videos"
                element={<Videos />}
              />

              <Route
                path="/line-chart"
                element={<LineChart />}
              />

              <Route
                path="/bar-chart"
                element={<BarChart />}
              />

            </Route>
          </Route>

          <Route
            path="/"
            element={<SignIn />}
          />

          <Route
            path="/signup"
            element={<SignUp />}
          />

          <Route
            path="*"
            element={<NotFound />}
          />

        </Routes>

      </Router>
    </>
  );
}

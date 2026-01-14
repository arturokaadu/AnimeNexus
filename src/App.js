import { Routes, Route } from "react-router-dom";
import { useState, useEffect, Suspense, lazy } from "react";
import { Home } from "./components/Anime/Home";
import { Header } from "./components/Common/Header";
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from "./components/Context/authContext";
import { ThemeProvider } from 'styled-components';
import { GlobalStyles } from './GlobalStyles';
import { theme, lightTheme } from './theme';
import { ProtectedRoute } from "./components/Shared/ProtectedRoute";
import { Icon } from '@iconify/react';

// Lazy load components for performance
const RegisterPage = lazy(() => import("./components/Auth/RegisterPage").then(module => ({ default: module.RegisterPage })));
const LoginPage = lazy(() => import("./components/Auth/LoginPage").then(module => ({ default: module.LoginPage })));
const AnimeDetails = lazy(() => import("./components/Anime/AnimeDetails").then(module => ({ default: module.AnimeDetails })));
const SearchResults = lazy(() => import("./components/Anime/SearchResults").then(module => ({ default: module.SearchResults })));
const Favorites = lazy(() => import("./components/Anime/Favorites").then(module => ({ default: module.Favorites })));
const ResetPasswordPage = lazy(() => import("./components/Auth/ResetPasswordPage").then(module => ({ default: module.ResetPasswordPage })));
const RecommendationsPage = lazy(() => import("./components/Media/RecommendationsPage").then(module => ({ default: module.RecommendationsPage })));
const HotCharactersPage = lazy(() => import("./components/NSFW/HotCharactersPage").then(module => ({ default: module.HotCharactersPage })));
const BrutalMomentsPage = lazy(() => import("./components/NSFW/BrutalMomentsPage").then(module => ({ default: module.BrutalMomentsPage })));
const SoundtracksPage = lazy(() => import("./components/Media/SoundtracksPage").then(module => ({ default: module.SoundtracksPage })));
const HiddenGemsPage = lazy(() => import("./components/Features/HiddenGemsPage").then(module => ({ default: module.HiddenGemsPage })));
const SeasonsPage = lazy(() => import("./components/Features/SeasonsPage").then(module => ({ default: module.SeasonsPage })));
const ComingSoonPage = lazy(() => import("./components/Features/ComingSoonPage").then(module => ({ default: module.ComingSoonPage })));
const AnimeInCinemasPage = lazy(() => import("./components/Features/AnimeInCinemasPage").then(module => ({ default: module.AnimeInCinemasPage })));
const GenrePage = lazy(() => import("./components/Anime/GenrePage").then(module => ({ default: module.GenrePage })));
const HistoryPage = lazy(() => import("./components/Profile/HistoryPage").then(module => ({ default: module.HistoryPage })));
const ProfilePage = lazy(() => import("./components/Profile/ProfilePage").then(module => ({ default: module.ProfilePage })));
const MangaGuide = lazy(() => import("./components/Features/MangaGuide").then(module => ({ default: module.MangaGuide })));
const MoodExplorer = lazy(() => import("./components/Features/MoodExplorer").then(module => ({ default: module.MoodExplorer })));

// Loading component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
    <Icon icon="eos-icons:loading" width="60" color="#00d4ff" />
  </div>
);

const App = () => {
  const [favs, setFavs] = useState([]);
  const { user, loading } = useAuth()
  const [showContent, setShowContent] = useState([]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true; // Default to dark mode
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      console.log("Toggling theme. Previous:", prev, "New:", !prev);
      const newMode = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newMode));
      return newMode;
    });
  };

  const handleToggleContent = (index) => {
    setShowContent((prevShowContent) => {
      const newShowContent = [...prevShowContent];
      newShowContent[index] = !newShowContent[index];
      return newShowContent;
    });
  };

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is logged in, get their favorites from local storage
        const favsInLocal = localStorage.getItem('favs');
        if (favsInLocal !== null) {
          const favsArr = JSON.parse(favsInLocal);
          setFavs(favsArr);
        }
      } else {
        // User is logged out, clear the favorites from local storage
        setFavs([]);
      }
    }
  }, [user, loading]);

  const addOrRemoveFromFavorites = (movieData) => (e) => {
    e.preventDefault();
    e.stopPropagation();

    const favMovies = localStorage.getItem("favs");
    let tempMovie;

    if (favMovies === null) {
      tempMovie = [];
    } else {
      tempMovie = JSON.parse(favMovies);
    }

    const movieId = movieData.mal_id || movieData.id;

    let filterM = tempMovie.find((e) => {
      const eId = e.mal_id || e.id;
      return eId === movieId;
    });

    if (!filterM) {
      tempMovie.push(movieData);
      localStorage.setItem("favs", JSON.stringify(tempMovie));
      setFavs(tempMovie);
      localStorage.setItem("favId", movieId);
      console.log("movie added:", movieId);
    } else {
      let moviesLeft = tempMovie.filter((e) => {
        const eId = e.mal_id || e.id;
        return eId !== movieId;
      });
      localStorage.setItem("favs", JSON.stringify(moviesLeft));

      setFavs(moviesLeft);
      localStorage.removeItem("favId");
      console.log("movie deleted:", movieId);
      if (!user) {
        // If user is not logged in, just update state, don't clear all? 
        // Original logic cleared all if !user? Logic seems odd.
        // Keeping original behavior but safer:
        // localStorage.removeItem("favs"); 
        // setFavs([]); 
      }
    }
  };

  return (
    <>
      <div>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #374151'
              },
            }}
          />
          <ThemeProvider theme={isDarkMode ? theme : lightTheme}>
            <GlobalStyles />
            <Header favs={favs} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route exact path="/register" element={<RegisterPage />} />
                <Route exact path="/login" element={<LoginPage />} />
                <Route
                  exact
                  path="/"
                  element={
                    <Home
                      favs={favs}
                      addOrRemoveFromFavorites={addOrRemoveFromFavorites}
                      showContent={showContent} handleToggleContent={handleToggleContent}
                    />
                  }
                />
                <Route exact path="/detalle" element={<AnimeDetails favs={favs}
                  addOrRemoveFromFavorites={addOrRemoveFromFavorites}
                  showContent={showContent} handleToggleContent={handleToggleContent} />} />
                <Route exact path="/resultados" element={<SearchResults favs={favs}
                  addOrRemoveFromFavorites={addOrRemoveFromFavorites}
                  showContent={showContent} handleToggleContent={handleToggleContent} />} />
                <Route
                  exact
                  path="/favoritos"
                  element={
                    <Favorites
                      favs={favs}
                      addOrRemoveFromFavorites={addOrRemoveFromFavorites}
                      showContent={showContent} handleToggleContent={handleToggleContent}
                    />
                  }
                />
                <Route exact path="/resetPassword" element={<ResetPasswordPage />} />
                <Route path="/genre/:genre" element={<GenrePage favs={favs} addOrRemoveFromFavorites={addOrRemoveFromFavorites} />} />
                <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                <Route exact path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route exact path="/recommendations" element={<RecommendationsPage />} />
                <Route exact path="/nsfw/hot-characters" element={<ProtectedRoute><HotCharactersPage /></ProtectedRoute>} />
                <Route exact path="/nsfw/brutal-moments" element={<ProtectedRoute><BrutalMomentsPage /></ProtectedRoute>} />
                <Route exact path="/manga-guide" element={<MangaGuide />} />
                <Route exact path="/coming-soon" element={<ComingSoonPage />} />
                <Route exact path="/cinemas" element={<AnimeInCinemasPage />} />
                <Route path="/seasons/:malId" element={<SeasonsPage />} />
                <Route path="/soundtracks/:malId" element={<SoundtracksPage />} />
                <Route exact path="/hidden-gems" element={<HiddenGemsPage />} />
                <Route exact path="/moods" element={<MoodExplorer />} />
              </Routes>
            </Suspense>
          </ThemeProvider>
        </AuthProvider>
      </div>
    </>
  );
};

export default App;

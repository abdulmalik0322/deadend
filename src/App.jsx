import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar.jsx';
import Footer from './components/Footer/Footer.jsx';
import RequireAuth from './components/RequireAuth/RequireAuth.jsx';
import { useAuth } from './context/AuthContext.jsx';

import Home from './pages/Home/Home.jsx';
import Explore from './pages/Explore/Explore.jsx';
import ExperienceDetail from './pages/ExperienceDetail/ExperienceDetail.jsx';
import Share from './pages/Share/Share.jsx';
import Decisions from './pages/Decisions/Decisions.jsx';
import DecisionNew from './pages/DecisionNew/DecisionNew.jsx';
import DecisionDetail from './pages/DecisionDetail/DecisionDetail.jsx';
import Similar from './pages/Similar/Similar.jsx';
import Analysis from './pages/Analysis/Analysis.jsx';
import Categories from './pages/Categories/Categories.jsx';
import CategoryDetail from './pages/CategoryDetail/CategoryDetail.jsx';
import HowItWorks from './pages/HowItWorks/HowItWorks.jsx';
import Profile from './pages/Profile/Profile.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import Saved from './pages/Saved/Saved.jsx';
import Notifications from './pages/Notifications/Notifications.jsx';
import Login from './pages/Login/Login.jsx';
import Register from './pages/Register/Register.jsx';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword/ResetPassword.jsx';
import About from './pages/About/About.jsx';
import Contact from './pages/Contact/Contact.jsx';
import Terms from './pages/Terms/Terms.jsx';
import Privacy from './pages/Privacy/Privacy.jsx';
import Guidelines from './pages/Guidelines/Guidelines.jsx';
import Admin from './pages/Admin/Admin.jsx';
import NotFound from './pages/NotFound/NotFound.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// /profile without a username -> redirect to the signed-in user's profile
function MyProfile() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: '/profile' }} replace />;
  return <Navigate to={`/profile/${user.username}`} replace />;
}

export default function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/experiences/:slug" element={<ExperienceDetail />} />
          <Route
            path="/share"
            element={
              <RequireAuth>
                <Share />
              </RequireAuth>
            }
          />
          <Route
            path="/decisions"
            element={
              <RequireAuth>
                <Decisions />
              </RequireAuth>
            }
          />
          <Route
            path="/decisions/new"
            element={
              <RequireAuth>
                <DecisionNew />
              </RequireAuth>
            }
          />
          <Route
            path="/decisions/:id"
            element={
              <RequireAuth>
                <DecisionDetail />
              </RequireAuth>
            }
          />
          <Route path="/similar" element={<Similar />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:slug" element={<CategoryDetail />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/saved"
            element={
              <RequireAuth>
                <Saved />
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <Notifications />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/guidelines" element={<Guidelines />} />
          <Route
            path="/admin"
            element={
              <RequireAuth role="admin">
                <Admin />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CookieConsent } from "@/components/CookieConsent";
import NotFound from "./pages/NotFound.tsx";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OrganizerEventLayout } from "@/components/OrganizerEventLayout";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Pricing from "./pages/Pricing";
import AuthCallback from "./pages/AuthCallback";
import PublicEventPage from "./pages/PublicEventPage";
import FounderCardPublic from "./pages/FounderCardPublic";
import { useSyncActiveEventFromUrl } from "@/lib/useActiveEvent";

import AttendeeDashboard from "./pages/attendee/Dashboard";
import ProfilePage from "./pages/attendee/Profile";
import ConnectPage from "./pages/attendee/Connect";
import ConnectionsPage from "./pages/attendee/Connections";
import DiscoverPage from "./pages/attendee/Discover";
import GamificationPage from "./pages/attendee/Gamification";
import NotificationsPage from "./pages/attendee/Notifications";
import EventsPage from "./pages/attendee/Events";
import EventDetailPage from "./pages/attendee/EventDetail";
import ApplyCardPage from "./pages/attendee/ApplyCard";
import EventAttendeesPage from "./pages/attendee/EventAttendees";
import PeopleIMetPage from "./pages/attendee/PeopleIMet";
import MessagesPage from "./pages/attendee/Messages";
import MyTicketsPage from "./pages/attendee/MyTickets";
import CheckInLanding from "./pages/CheckInLanding";
import ClaimAccountPage from "./pages/ClaimAccount";

import OrganizerDashboard from "./pages/organizer/Dashboard";
import CreateEventPage from "./pages/organizer/CreateEvent";
import OrgEventDetail from "./pages/organizer/OrgEventDetail";
import LeadsPage from "./pages/organizer/Leads";
import PayoutsPage from "./pages/organizer/Payouts";
import AttendeeDirectoryPage from "./pages/organizer/AttendeeDirectory";
import EventManagePage from "./pages/organizer/EventManage";
import CheckInPage from "./pages/organizer/CheckIn";
import OrgAnalyticsPage from "./pages/organizer/Analytics";

import GuestsTab from "./pages/organizer/event/GuestsTab";
import BlastsTab from "./pages/organizer/event/BlastsTab";
import MoreTab from "./pages/organizer/event/MoreTab";
import VisitorsTab from "./pages/organizer/event/VisitorsTab";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsersPage from "./pages/admin/Users";
import AdminSettingsPage from "./pages/admin/Settings";
import AdminEventsPage from "./pages/admin/Events";
import AdminAnalyticsPage from "./pages/admin/Analytics";
import AdminPermissionsPage from "./pages/admin/Permissions";
import AdminFounderCardReviewPage from "./pages/admin/FounderCardReview";
import AdminUserDetailPage from "./pages/admin/UserDetail";

const queryClient = new QueryClient();

const RouterMounted = () => {
  // Mount once inside the router so URL-derived "active event" stays in sync
  // with location.pathname for any consumer (Connect, Profile, scanner).
  useSyncActiveEventFromUrl();
  return null;
};

const BRAND = "FounderKey";
const DEFAULT_TITLE = "FounderKey — NFC Business Cards for Startup Networking Events";
// Longest-prefix match → "<Page> | FounderKey". Detail pages keep the brand default.
const TITLE_BY_PREFIX: [string, string][] = [
  ["/login", "Sign in"],
  ["/register", "Create account"],
  ["/forgot-password", "Reset password"],
  ["/reset-password", "Reset password"],
  ["/verify-email", "Verify email"],
  ["/dashboard", "Dashboard"],
  ["/discover", "Discover"],
  ["/events", "Events"],
  ["/connect", "Connect"],
  ["/connections", "Connections"],
  ["/people-i-met", "People I Met"],
  ["/messages", "Messages"],
  ["/gamification", "FK Score"],
  ["/notifications", "Notifications"],
  ["/profile", "Profile"],
  ["/my-tickets", "My Tickets"],
  ["/apply-card", "Founder Card"],
  ["/organizer/payouts", "Payouts"],
  ["/organizer", "Organizer"],
  ["/admin", "Admin"],
];

/** Updates document.title on SPA navigation so each view has a distinct title
 *  (SEO + screen-reader announcement). */
const RouteTitle = () => {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;
    const match = TITLE_BY_PREFIX.filter(([p]) => path === p || path.startsWith(p + "/") || path.startsWith(p))
      .sort((a, b) => b[0].length - a[0].length)[0];
    document.title = match ? `${match[1]} | ${BRAND}` : DEFAULT_TITLE;
  }, [location.pathname]);
  return null;
};

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RouterMounted />
        <RouteTitle />
        <CookieConsent />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {/* Public shareable event page — no auth required */}
          <Route path="/e/:id" element={<PublicEventPage />} />
          {/* Public shareable Founder Card — no auth required */}
          <Route path="/c/:slug" element={<FounderCardPublic mode="public" />} />
          {/* Card view — accepts user id OR username. In-app chrome when signed in,
              public chrome for anonymous visitors (vanity URL: /card/:username). */}
          <Route path="/card/:userId" element={<FounderCardPublic mode="app" />} />

          {/* Attendee surfaces — any signed-in user can browse / RSVP / manage
              their attendance. Same account can also host events; only admin
              routes are role-gated. */}
          <Route path="/dashboard" element={<ProtectedRoute><AttendeeDashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/connect" element={<ProtectedRoute><ConnectPage /></ProtectedRoute>} />
          <Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
          <Route path="/people-i-met" element={<ProtectedRoute><PeopleIMetPage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/messages/:id" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/my-tickets" element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
          <Route path="/discover" element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} />
          <Route path="/gamification" element={<ProtectedRoute><GamificationPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
          <Route path="/event/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
          <Route path="/event/:id/attendees" element={<ProtectedRoute><EventAttendeesPage /></ProtectedRoute>} />
          {/* Check-in via QR poster URL — auth gate handled inside the page */}
          <Route path="/checkin/:token" element={<CheckInLanding />} />
          {/* Magic-link account claim from CSV invitation email */}
          <Route path="/claim/:token" element={<ClaimAccountPage />} />
          <Route path="/apply-card" element={<ProtectedRoute><ApplyCardPage /></ProtectedRoute>} />

          {/* Organizer surfaces — any signed-in user can host. Data-layer
              ownership checks (organizerId === currentUser.id) keep one host
              from seeing another's events. */}
          <Route path="/organizer/dashboard" element={<ProtectedRoute><OrganizerDashboard /></ProtectedRoute>} />
          {/* Luma-style: page renders for anyone — even signed-out guests.
              The CreateEventPage shows an overlay sign-in popup itself when
              the user isn't authenticated, and the form submit is gated. */}
          <Route path="/organizer/events/create" element={<CreateEventPage />} />
          <Route path="/organizer/attendees" element={<ProtectedRoute><AttendeeDirectoryPage /></ProtectedRoute>} />
          <Route path="/organizer/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
          <Route path="/organizer/payouts" element={<ProtectedRoute><PayoutsPage /></ProtectedRoute>} />
          <Route path="/organizer/events/:id" element={<ProtectedRoute><OrganizerEventLayout /></ProtectedRoute>}>
            <Route index element={<OrgEventDetail />} />
            <Route path="guests" element={<GuestsTab />} />
            <Route path="manage" element={<EventManagePage />} />
            <Route path="blasts" element={<BlastsTab />} />
            <Route path="analytics" element={<OrgAnalyticsPage />} />
            <Route path="checkin" element={<CheckInPage />} />
            <Route path="visitors" element={<VisitorsTab />} />
            <Route path="more" element={<MoreTab />} />
          </Route>

          {/* Admin — protected */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/users/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminUserDetailPage /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute allowedRoles={['admin']}><AdminEventsPage /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalyticsPage /></ProtectedRoute>} />
          <Route path="/admin/permissions" element={<ProtectedRoute allowedRoles={['admin']}><AdminPermissionsPage /></ProtectedRoute>} />
          <Route path="/admin/founder-cards" element={<ProtectedRoute allowedRoles={['admin']}><AdminFounderCardReviewPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettingsPage /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

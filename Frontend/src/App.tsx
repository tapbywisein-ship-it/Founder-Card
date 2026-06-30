import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import { setUnauthorizedHandler } from "@/services/api";
import { useAppStore } from "@/store/appStore";
import { apiGetMe } from "@/services/auth.service";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CookieConsent } from "@/components/CookieConsent";
import NotFound from "./pages/NotFound.tsx";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OrganizerEventLayout } from "@/components/OrganizerEventLayout";
import { useSyncActiveEventFromUrl } from "@/lib/useActiveEvent";

// Entry points stay eager so the first paint has no async hop.
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";

// Everything else is route-split: each page becomes its own chunk that the
// browser only downloads when that route is visited. This is the single biggest
// lever on initial load — the admin/organizer/charting code no longer ships to
// a visitor who's just signing in.
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Pricing = lazy(() => import("./pages/Pricing"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const PublicEventPage = lazy(() => import("./pages/PublicEventPage"));
const FounderCardPublic = lazy(() => import("./pages/FounderCardPublic"));

const AttendeeDashboard = lazy(() => import("./pages/attendee/Dashboard"));
const ProfilePage = lazy(() => import("./pages/attendee/Profile"));
const ConnectPage = lazy(() => import("./pages/attendee/Connect"));
const ConnectionsPage = lazy(() => import("./pages/attendee/Connections"));
const DiscoverPage = lazy(() => import("./pages/attendee/Discover"));
const GamificationPage = lazy(() => import("./pages/attendee/Gamification"));
const NotificationsPage = lazy(() => import("./pages/attendee/Notifications"));
const EventsPage = lazy(() => import("./pages/attendee/Events"));
const EventDetailPage = lazy(() => import("./pages/attendee/EventDetail"));
const ApplyCardPage = lazy(() => import("./pages/attendee/ApplyCard"));
const CardAnalyticsPage = lazy(() => import("./pages/attendee/CardAnalytics"));
const EventAttendeesPage = lazy(() => import("./pages/attendee/EventAttendees"));
const PeopleIMetPage = lazy(() => import("./pages/attendee/PeopleIMet"));
const MessagesPage = lazy(() => import("./pages/attendee/Messages"));
const MyTicketsPage = lazy(() => import("./pages/attendee/MyTickets"));
const CheckInLanding = lazy(() => import("./pages/CheckInLanding"));
const ClaimAccountPage = lazy(() => import("./pages/ClaimAccount"));
const MembershipPage = lazy(() => import("./pages/attendee/Membership"));
const NetworkSearchPage = lazy(() => import("./pages/attendee/NetworkSearch"));

const OrganizerDashboard = lazy(() => import("./pages/organizer/Dashboard"));
const CreateEventPage = lazy(() => import("./pages/organizer/CreateEvent"));
const OrgEventDetail = lazy(() => import("./pages/organizer/OrgEventDetail"));
const LeadsPage = lazy(() => import("./pages/organizer/Leads"));
const PayoutsPage = lazy(() => import("./pages/organizer/Payouts"));
const AttendeeDirectoryPage = lazy(() => import("./pages/organizer/AttendeeDirectory"));
const EventManagePage = lazy(() => import("./pages/organizer/EventManage"));
const CheckInPage = lazy(() => import("./pages/organizer/CheckIn"));
const OrgAnalyticsPage = lazy(() => import("./pages/organizer/Analytics"));

const GuestsTab = lazy(() => import("./pages/organizer/event/GuestsTab"));
const BlastsTab = lazy(() => import("./pages/organizer/event/BlastsTab"));
const MoreTab = lazy(() => import("./pages/organizer/event/MoreTab"));
const VisitorsTab = lazy(() => import("./pages/organizer/event/VisitorsTab"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsersPage = lazy(() => import("./pages/admin/Users"));
const AdminSettingsPage = lazy(() => import("./pages/admin/Settings"));
const AdminEventsPage = lazy(() => import("./pages/admin/Events"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/Analytics"));
const AdminPermissionsPage = lazy(() => import("./pages/admin/Permissions"));
const AdminFounderCardReviewPage = lazy(() => import("./pages/admin/FounderCardReview"));
const AdminUserDetailPage = lazy(() => import("./pages/admin/UserDetail"));
const AdminRevenuePage = lazy(() => import("./pages/admin/Revenue"));
const AdminAuditLogsPage = lazy(() => import("./pages/admin/AuditLogs"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Lightweight fallback while a route chunk loads. Kept minimal so it paints
 *  instantly and doesn't itself pull in heavy deps. */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
  </div>
);

const RouterMounted = () => {
  useSyncActiveEventFromUrl();
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const login = useAppStore((s) => s.login);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      navigate('/login', { replace: true });
    });
  }, [logout, navigate]);

  // Refresh user on mount so stale localStorage values (fkScore, role, etc.) stay current.
  useEffect(() => {
    if (!isAuthenticated) return;
    apiGetMe().then(login).catch(() => {/* token may be expired — unauthorizedHandler handles logout */});
  }, [isAuthenticated, login]);

  return null;
};

const BRAND = "TapByWisein";
const DEFAULT_TITLE = "TapByWisein — NFC Business Cards for Startup Networking Events";
// Longest-prefix match → "<Page> | TapByWisein". Detail pages keep the brand default.
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
  ["/network-search", "Network Search"],
  ["/people-i-met", "People I Met"],
  ["/messages", "Messages"],
  ["/gamification", "FK Score"],
  ["/notifications", "Notifications"],
  ["/profile", "Profile"],
  ["/my-tickets", "My Tickets"],
  ["/apply-card", "Tap Card"],
  ["/card-analytics", "Card Analytics"],
  ["/membership", "Membership"],
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
  <ErrorBoundary>
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RouterMounted />
        <RouteTitle />
        <CookieConsent />
        <Suspense fallback={<PageLoader />}>
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
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['attendee']}><AttendeeDashboard /></ProtectedRoute>} />
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
          <Route path="/card-analytics" element={<ProtectedRoute><CardAnalyticsPage /></ProtectedRoute>} />
          <Route path="/membership" element={<ProtectedRoute><MembershipPage /></ProtectedRoute>} />
          <Route path="/network-search" element={<ProtectedRoute><NetworkSearchPage /></ProtectedRoute>} />

          {/* Organizer surfaces — gated to organizers/admins so attendees can't
              wander into the host portal. Data-layer ownership checks
              (organizerId === currentUser.id) keep one host from seeing
              another's events. */}
          <Route path="/organizer/dashboard" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><OrganizerDashboard /></ProtectedRoute>} />
          {/* Luma-style: page renders for anyone — even signed-out guests.
              The CreateEventPage shows an overlay sign-in popup itself when
              the user isn't authenticated, and the form submit is gated. */}
          <Route path="/organizer/events/create" element={<CreateEventPage />} />
          <Route path="/organizer/attendees" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><AttendeeDirectoryPage /></ProtectedRoute>} />
          <Route path="/organizer/leads" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><LeadsPage /></ProtectedRoute>} />
          <Route path="/organizer/payouts" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><PayoutsPage /></ProtectedRoute>} />
          <Route path="/organizer/events/:id" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><OrganizerEventLayout /></ProtectedRoute>}>
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
          <Route path="/admin/revenue" element={<ProtectedRoute allowedRoles={['admin']}><AdminRevenuePage /></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AdminAuditLogsPage /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
);

export default App;

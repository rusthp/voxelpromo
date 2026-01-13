import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages for code-splitting
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Index = lazy(() => import("./pages/Index"));
const Products = lazy(() => import("./pages/Products"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Publications = lazy(() => import("./pages/Publications"));
const Settings = lazy(() => import("./pages/Settings"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Profile = lazy(() => import("./pages/Profile"));
const InstagramPage = lazy(() => import("./pages/Instagram"));
const Admin = lazy(() => import("./pages/Admin"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFailure = lazy(() => import("./pages/PaymentFailure"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Contact = lazy(() => import("./pages/Contact"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/termos" element={<TermsOfUse />} />
                <Route path="/privacidade" element={<PrivacyPolicy />} />
                <Route path="/contato" element={<Contact />} />
                <Route path="/novidades" element={<NewsPage />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Protected routes - require authentication */}
                <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/publications" element={<ProtectedRoute><Publications /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/instagram" element={<ProtectedRoute><InstagramPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute>} />

                {/* Payment routes */}
                <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
                <Route path="/checkout/:planId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
                <Route path="/payment/failure" element={<ProtectedRoute><PaymentFailure /></ProtectedRoute>} />
                <Route path="/payment/pending" element={<ProtectedRoute><PaymentFailure /></ProtectedRoute>} />

                {/* Catch-all 404 */}

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;

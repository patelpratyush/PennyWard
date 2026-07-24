import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { useTheme } from '@/hooks/useTheme'
import MarketingLayout from '@/components/layout/MarketingLayout'
import AppLayout from '@/components/layout/AppLayout'
import { LoadingSkeleton } from '@/components/shared/States'

// Public pages
const Landing = lazy(() => import('@/pages/marketing/Landing'))
const Features = lazy(() => import('@/pages/marketing/Features'))
const Pricing = lazy(() => import('@/pages/marketing/Pricing'))
const Security = lazy(() => import('@/pages/marketing/Security'))
const About = lazy(() => import('@/pages/marketing/About'))
const Contact = lazy(() => import('@/pages/marketing/Contact'))
const Help = lazy(() => import('@/pages/marketing/Help'))
const Legal = lazy(() => import('@/pages/marketing/Legal'))

// Auth pages
const SignIn = lazy(() => import('@/pages/auth/SignIn'))
const SignUp = lazy(() => import('@/pages/auth/SignUp'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'))

// Onboarding
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'))

// App pages
const Dashboard = lazy(() => import('@/pages/app/Dashboard'))
const Transactions = lazy(() => import('@/pages/app/Transactions'))
const TransactionsImport = lazy(() => import('@/pages/app/TransactionsImport'))
const Budgets = lazy(() => import('@/pages/app/Budgets'))
const Accounts = lazy(() => import('@/pages/app/Accounts'))
const AccountDetail = lazy(() => import('@/pages/app/AccountDetail'))
const Debt = lazy(() => import('@/pages/app/Debt'))
const PayoffPlanner = lazy(() => import('@/pages/app/PayoffPlanner'))
const CarCalculator = lazy(() => import('@/pages/app/CarCalculator'))
const LoanCalculator = lazy(() => import('@/pages/app/LoanCalculator'))
const Scenarios = lazy(() => import('@/pages/app/Scenarios'))
const Amortization = lazy(() => import('@/pages/app/Amortization'))
const Goals = lazy(() => import('@/pages/app/Goals'))
const GoalDetail = lazy(() => import('@/pages/app/GoalDetail'))
const Bills = lazy(() => import('@/pages/app/Bills'))
const Stocks = lazy(() => import('@/pages/app/Stocks'))
const StockDetail = lazy(() => import('@/pages/app/StockDetail'))
const Reports = lazy(() => import('@/pages/app/Reports'))
const Notifications = lazy(() => import('@/pages/app/Notifications'))
const Settings = lazy(() => import('@/pages/app/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function Fallback() {
  return <div className="p-6"><LoadingSkeleton rows={4} /></div>
}

export default function App() {
  useTheme()
  return (
    <>
      <Suspense fallback={<Fallback />}>
        <Routes>
          {/* Public marketing site */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/security" element={<Security />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/help" element={<Help />} />
            <Route path="/privacy" element={<Legal kind="privacy" />} />
            <Route path="/terms" element={<Legal kind="terms" />} />
          </Route>

          {/* Authentication */}
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Authenticated application */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="transactions/import" element={<TransactionsImport />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="accounts/:id" element={<AccountDetail />} />
            <Route path="debt" element={<Debt />} />
            <Route path="debt/payoff-planner" element={<PayoffPlanner />} />
            <Route path="loans/car-calculator" element={<CarCalculator />} />
            <Route path="loans/calculator" element={<LoanCalculator />} />
            <Route path="loans/scenarios" element={<Scenarios />} />
            <Route path="loans/:id/amortization" element={<Amortization />} />
            <Route path="goals" element={<Goals />} />
            <Route path="goals/:id" element={<GoalDetail />} />
            <Route path="bills" element={<Bills />} />
            <Route path="stocks" element={<Stocks />} />
            <Route path="stocks/:ticker" element={<StockDetail />} />
            <Route path="reports" element={<Reports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings/:section" element={<Settings />} />
            <Route path="settings" element={<Navigate to="/app/settings/profile" replace />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster richColors position="top-right" />
    </>
  )
}

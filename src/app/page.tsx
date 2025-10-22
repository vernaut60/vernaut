import LandingPage from "../components/landing/LandingPage";

/**
 * Landing page - shown to unauthenticated users
 * Authenticated users are automatically redirected to /dashboard by middleware
 */
export default function Home() {
  return <LandingPage />;
}

import HeroSection from "./HeroSection";
import HowItWorks from "./HowItWorks";
import DemoSection from "./DemoSection";
import ValueProps from "./ValueProps";
import SignupCTA from "./SignupCTA";
import DashboardTeaser from "./DashboardTeaser";
import FinalCTA from "./FinalCTA";

export default function LandingPage() {
  return (
    <div className="w-full min-h-screen">
      <HeroSection />
      <HowItWorks />
      <DemoSection />
      <ValueProps />
      <SignupCTA />
      <DashboardTeaser />
      <FinalCTA />
    </div>
  );
}



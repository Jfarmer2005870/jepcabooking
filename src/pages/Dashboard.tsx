import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ConsumerDashboard from "@/components/dashboard/ConsumerDashboard";
import BusinessDashboard from "@/components/dashboard/BusinessDashboard";

const Dashboard = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(`/auth?redirect=${encodeURIComponent("/dashboard")}`);
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20 md:pt-24">
        <div className="container mx-auto px-4 py-8">
          {userRole === "business" ? (
            <BusinessDashboard />
          ) : (
            <ConsumerDashboard />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;

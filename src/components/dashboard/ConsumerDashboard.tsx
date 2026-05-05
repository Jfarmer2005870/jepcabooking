import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Search, MapPin, Star, ArrowRight, FileText } from "lucide-react";
import LeaveReviewDialog from "./LeaveReviewDialog";
import InvoiceDialog, { InvoiceBooking } from "./InvoiceDialog";

interface Booking {
  id: string;
  business_id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  service_address: string | null;
  notes: string | null;
  total_price: number | null;
  platform_fee: number | null;
  travel_fee: number | null;
  travel_distance_miles: number | null;
  business_signature: string | null;
  business_signature_at: string | null;
  business_signature_name: string | null;
  created_at: string;
  services: {
    title: string;
    category: string;
  };
  business_profiles: {
    business_name: string;
    city: string | null;
    state: string | null;
  };
  profiles?: { full_name: string | null; email: string } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pending: "Awaiting business approval",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ConsumerDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          services (title, category),
          business_profiles (business_name, city, state)
        `)
        .eq("consumer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingBookings = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed"
  );
  const pastBookings = bookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your bookings and find new services</p>
        </div>
        <Button asChild>
          <Link to="/services">
            <Search className="w-4 h-4 mr-2" />
            Find Services
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming Bookings</CardDescription>
            <CardTitle className="text-3xl">{upcomingBookings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed Services</CardDescription>
            <CardTitle className="text-3xl">
              {bookings.filter((b) => b.status === "completed").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spent</CardDescription>
            <CardTitle className="text-3xl">
              ${bookings
                .filter((b) => b.status === "completed")
                .reduce((sum, b) => sum + (b.total_price || 0), 0)
                .toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <div>
        <h2 className="text-xl font-semibold font-display text-foreground mb-4">
          Upcoming Bookings
        </h2>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : upcomingBookings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No upcoming bookings</h3>
              <p className="text-muted-foreground mb-4">
                Find and book services from trusted local providers
              </p>
              <Button asChild>
                <Link to="/services">Browse Services</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{booking.services.title}</CardTitle>
                      <CardDescription>{booking.business_profiles.business_name}</CardDescription>
                    </div>
                    <Badge className={statusColors[booking.status]}>
                      {statusLabels[booking.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {booking.scheduled_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(booking.scheduled_date).toLocaleDateString()}
                      </span>
                    )}
                    {booking.scheduled_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {booking.scheduled_time}
                      </span>
                    )}
                    {booking.business_profiles.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {booking.business_profiles.city}
                      </span>
                    )}
                  </div>
                  {booking.total_price && (
                    <p className="mt-3 font-semibold text-primary">
                      ${booking.total_price.toFixed(2)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold font-display text-foreground mb-4">
            Past Bookings
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pastBookings.slice(0, 6).map((booking) => (
              <Card key={booking.id} className="opacity-75 hover:opacity-100 transition-opacity">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{booking.services.title}</CardTitle>
                    <Badge variant="outline" className={statusColors[booking.status]}>
                      {statusLabels[booking.status]}
                    </Badge>
                  </div>
                  <CardDescription>{booking.business_profiles.business_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </span>
                    {booking.status === "completed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReviewBooking(booking)}
                      >
                        <Star className="w-4 h-4 mr-1" />
                        Leave Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {reviewBooking && (
        <LeaveReviewDialog
          open={!!reviewBooking}
          onOpenChange={(open) => !open && setReviewBooking(null)}
          bookingId={reviewBooking.id}
          businessId={reviewBooking.business_id}
          serviceName={reviewBooking.services.title}
          businessName={reviewBooking.business_profiles.business_name}
          onReviewSubmitted={() => {
            setReviewBooking(null);
          }}
        />
      )}
    </div>
  );
};

export default ConsumerDashboard;

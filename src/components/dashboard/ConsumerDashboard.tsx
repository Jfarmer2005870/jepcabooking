import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Search, MapPin, Star, FileText, MessageSquare, CalendarPlus, CalendarClock, X, Loader2 } from "lucide-react";
import LeaveReviewDialog from "./LeaveReviewDialog";
import InvoiceDialog, { InvoiceBooking } from "./InvoiceDialog";
import BookingStatusTracker from "./BookingStatusTracker";
import QuickCategories from "./QuickCategories";
import RescheduleBookingDialog from "./RescheduleBookingDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { downloadBookingICS } from "@/lib/calendar";
import { toast } from "@/hooks/use-toast";

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
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchBookings();

    const channel = supabase
      .channel("consumer-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `consumer_id=eq.${user.id}`,
        },
        () => fetchBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const activeBookings = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed" || b.status === "in_progress"
  );
  const pastBookings = bookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/services?q=${encodeURIComponent(q)}` : "/services");
  };

  const handleAddToCalendar = (booking: Booking) => {
    if (!booking.scheduled_date) {
      toast({
        title: "No date scheduled",
        description: "This booking doesn't have a scheduled date yet.",
        variant: "destructive",
      });
      return;
    }
    downloadBookingICS({
      id: booking.id,
      title: `${booking.services.title} — ${booking.business_profiles.business_name}`,
      description: booking.notes || `Booking with ${booking.business_profiles.business_name} via Jepca.`,
      location: booking.service_address || undefined,
      date: booking.scheduled_date,
      time: booking.scheduled_time,
      durationMinutes: 60,
    });
    toast({
      title: "Calendar event ready",
      description: "Open the downloaded file to add it to your calendar.",
    });
  };

  const handleConfirmCancel = async () => {
    if (!cancelBooking) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", cancelBooking.id);
      if (error) throw error;
      toast({
        title: "Booking cancelled",
        description: "The provider has been notified.",
      });
      setCancelBooking(null);
    } catch (err: any) {
      toast({
        title: "Couldn't cancel",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };
    <div className="space-y-8">
      {/* Welcome + Search */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            What do you need today?
          </h1>
          <p className="text-muted-foreground mt-1">
            Book a trusted local pro in seconds
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search cleaning, plumbing, electrician…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-28 h-14 text-base rounded-full shadow-sm"
          />
          <Button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full h-11"
          >
            Search
          </Button>
        </form>

        {/* Quick categories */}
        <QuickCategories />
      </div>

      {/* Active Bookings — Uber Eats style tracker */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold font-display text-foreground">
            Active bookings
          </h2>
          {activeBookings.length > 0 && (
            <Badge variant="secondary" className="rounded-full">
              {activeBookings.length} active
            </Badge>
          )}
        </div>

        {loading ? (
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-12 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ) : activeBookings.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No active bookings</h3>
              <p className="text-muted-foreground mb-4">
                Find and book services from trusted local providers
              </p>
              <Button asChild>
                <Link to="/services">Browse services</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeBookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <div className="border-l-4 border-primary">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg truncate">
                          {booking.services.title}
                        </CardTitle>
                        <CardDescription className="truncate">
                          {booking.business_profiles.business_name}
                        </CardDescription>
                      </div>
                      {booking.total_price && (
                        <span className="text-lg font-bold text-primary whitespace-nowrap">
                          ${booking.total_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <BookingStatusTracker status={booking.status} />

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-2 border-t border-border">
                      {booking.scheduled_date && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {new Date(booking.scheduled_date).toLocaleDateString()}
                        </span>
                      )}
                      {booking.scheduled_time && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {booking.scheduled_time}
                        </span>
                      )}
                      {booking.service_address && (
                        <span className="flex items-center gap-1.5 truncate max-w-xs">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate">{booking.service_address}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/dashboard?tab=messages">
                          <MessageSquare className="w-4 h-4 mr-1.5" />
                          Message provider
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInvoiceBooking(booking)}
                      >
                        <FileText className="w-4 h-4 mr-1.5" />
                        Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddToCalendar(booking)}
                        disabled={!booking.scheduled_date}
                      >
                        <CalendarPlus className="w-4 h-4 mr-1.5" />
                        Add to calendar
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">{activeBookings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">
              {bookings.filter((b) => b.status === "completed").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total spent</CardDescription>
            <CardTitle className="text-3xl">
              ${bookings
                .filter((b) => b.status === "completed")
                .reduce((sum, b) => sum + (b.total_price || 0), 0)
                .toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
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
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInvoiceBooking(booking)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Invoice
                      </Button>
                      {booking.status === "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReviewBooking(booking)}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      )}
                    </div>
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

      <InvoiceDialog
        open={!!invoiceBooking}
        onOpenChange={(open) => !open && setInvoiceBooking(null)}
        booking={invoiceBooking as unknown as InvoiceBooking}
      />
    </div>
  );
};

export default ConsumerDashboard;

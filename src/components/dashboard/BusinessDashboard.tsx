import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Plus, 
  DollarSign, 
  Users, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddServiceDialog from "./AddServiceDialog";

interface BusinessProfile {
  id: string;
  business_name: string;
  rating: number | null;
  total_reviews: number | null;
}

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_min: number | null;
  price_max: number | null;
  price_type: string | null;
  is_active: boolean;
}

interface Booking {
  id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  service_address: string | null;
  notes: string | null;
  total_price: number | null;
  created_at: string;
  services: {
    title: string;
  };
  profiles: {
    full_name: string | null;
    email: string;
    phone: string | null;
  } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const BusinessDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    details_submitted?: boolean;
  } | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBusinessData();
      checkStripeStatus();
    }
  }, [user]);

  useEffect(() => {
    if (searchParams.get("stripe_connected") === "true") {
      checkStripeStatus();
      toast({ title: "Stripe connected!", description: "Your payment account has been set up." });
    }
  }, [searchParams]);

  const getFunctionAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error("You need to sign in again to continue.");
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const checkStripeStatus = async () => {
    try {
      const headers = await getFunctionAuthHeaders();
      const { data, error } = await supabase.functions.invoke("connect-stripe-account", {
        body: { action: "status" },
        headers,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data) {
        setStripeStatus(data);
      }
    } catch (e) {
      console.error("Error checking Stripe status:", e);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const headers = await getFunctionAuthHeaders();
      const { data, error } = await supabase.functions.invoke("connect-stripe-account", {
        body: { action: "onboard" },
        headers,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to start Stripe setup",
        variant: "destructive",
      });
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    setOpeningDashboard(true);
    try {
      const headers = await getFunctionAuthHeaders();
      const { data, error } = await supabase.functions.invoke("create-stripe-login-link", { headers });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to open Stripe dashboard",
        variant: "destructive",
      });
    } finally {
      setOpeningDashboard(false);
    }
  };

  const fetchBusinessData = async () => {
    if (!user) return;

    try {
      // Fetch business profile
      const { data: profile, error: profileError } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setBusinessProfile(profile);

      if (profile) {
        // Fetch services
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("*")
          .eq("business_id", profile.id)
          .order("created_at", { ascending: false });

        if (servicesError) throw servicesError;
        setServices(servicesData || []);

        // Fetch bookings with consumer profiles
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select(`
            *,
            services (title)
          `)
          .eq("business_id", profile.id)
          .order("created_at", { ascending: false });

        if (bookingsError) throw bookingsError;

        // Fetch profiles for each booking
        const bookingsWithProfiles = await Promise.all(
          (bookingsData || []).map(async (booking) => {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, email, phone")
              .eq("user_id", booking.consumer_id)
              .maybeSingle();
            
            return {
              ...booking,
              profiles: profileData,
            };
          })
        );

        setBookings(bookingsWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching business data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled") => {
    setUpdatingBooking(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;

      setBookings(bookings.map((b) => 
        b.id === bookingId ? { ...b, status: newStatus } : b
      ));

      toast({
        title: "Booking updated",
        description: `Booking has been ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({
        title: "Error",
        description: "Failed to update booking status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingBooking(null);
    }
  };

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const activeBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "in_progress");
  const completedBookings = bookings.filter((b) => b.status === "completed");

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            {businessProfile?.business_name || "Business Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">Manage your services and bookings</p>
        </div>
        <Button onClick={() => setIsAddServiceOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Stripe Connect Status */}
      {stripeStatus && !stripeStatus.charges_enabled && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Set up payments to receive bookings</p>
                <p className="text-sm text-muted-foreground">
                  Connect your Stripe account so customers can pay you directly. You'll receive payments minus a 5% platform fee.
                </p>
              </div>
            </div>
            <Button onClick={handleConnectStripe} disabled={connectingStripe} className="flex-shrink-0">
              {connectingStripe ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              {stripeStatus.connected ? "Complete Setup" : "Connect Stripe"}
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {stripeStatus?.charges_enabled && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-foreground">
                <span className="font-medium">Payments active</span> — You're set up to receive payments from customers.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenStripeDashboard}
              disabled={openingDashboard}
              className="flex-shrink-0"
            >
              {openingDashboard ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Stripe Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Pending Requests
            </CardDescription>
            <CardTitle className="text-3xl">{pendingBookings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Jobs
            </CardDescription>
            <CardTitle className="text-3xl">{activeBookings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Completed
            </CardDescription>
            <CardTitle className="text-3xl">{completedBookings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Earnings
            </CardDescription>
            <CardTitle className="text-3xl">${totalEarnings.toFixed(0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Pending Booking Requests */}
      {pendingBookings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold font-display text-foreground mb-4">
            Pending Requests
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingBookings.map((booking) => (
              <Card key={booking.id} className="border-yellow-200 bg-yellow-50/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{booking.services.title}</CardTitle>
                      <CardDescription>
                        {booking.profiles?.full_name || booking.profiles?.email || "Customer"}
                      </CardDescription>
                    </div>
                    <Badge className={statusColors[booking.status]}>
                      {statusLabels[booking.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
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
                  </div>
                  
                  {/* Customer Contact Info */}
                  {/* Service Address */}
                  {booking.service_address && (
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Service Location</p>
                      <p className="text-sm flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{booking.service_address}</span>
                      </p>
                    </div>
                  )}

                  {/* Customer Contact Info */}
                  <div className="bg-background rounded-md p-3 mb-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Contact</p>
                    {booking.profiles?.email && (
                      <p className="text-sm flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <a href={`mailto:${booking.profiles.email}`} className="text-primary hover:underline">
                          {booking.profiles.email}
                        </a>
                      </p>
                    )}
                    {booking.profiles?.phone && (
                      <p className="text-sm flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <a href={`tel:${booking.profiles.phone}`} className="text-primary hover:underline">
                          {booking.profiles.phone}
                        </a>
                      </p>
                    )}
                    {!booking.profiles?.phone && (
                      <p className="text-xs text-muted-foreground italic">No phone number provided</p>
                    )}
                  </div>
                  
                  {booking.notes && (
                    <p className="text-sm text-muted-foreground mb-4 bg-muted/50 p-2 rounded">
                      <span className="font-medium">Notes:</span> "{booking.notes}"
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateBookingStatus(booking.id, "confirmed")}
                      disabled={updatingBooking === booking.id}
                    >
                      {updatingBooking === booking.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateBookingStatus(booking.id, "cancelled")}
                      disabled={updatingBooking === booking.id}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Your Services */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold font-display text-foreground">Your Services</h2>
          <Button variant="outline" size="sm" onClick={() => setIsAddServiceOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
        {services.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No services yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first service to start receiving booking requests
              </p>
              <Button onClick={() => setIsAddServiceOpen(true)}>Add Your First Service</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.id} className={!service.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{service.title}</CardTitle>
                    <Badge variant={service.is_active ? "default" : "secondary"}>
                      {service.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="capitalize">{service.category.replace("_", " ")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {service.description || "No description"}
                  </p>
                  <p className="font-semibold text-primary">
                    {service.price_min && service.price_max
                      ? `$${service.price_min} - $${service.price_max}`
                      : service.price_min
                      ? `From $${service.price_min}`
                      : "Get Quote"}
                    {service.price_type === "hourly" && "/hr"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Bookings */}
      {activeBookings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold font-display text-foreground mb-4">
            Active Jobs
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activeBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{booking.services.title}</CardTitle>
                      <CardDescription>
                        {booking.profiles?.full_name || booking.profiles?.email || "Customer"}
                      </CardDescription>
                    </div>
                    <Badge className={statusColors[booking.status]}>
                      {statusLabels[booking.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
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
                    {booking.total_price && (
                      <span className="font-semibold text-primary">
                        ${booking.total_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  {/* Service Address */}
                  {booking.service_address && (
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Service Location</p>
                      <p className="text-sm flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{booking.service_address}</span>
                      </p>
                    </div>
                  )}
                  
                  {/* Customer Contact Info */}
                  <div className="bg-muted/50 rounded-md p-3 mb-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Contact</p>
                    {booking.profiles?.email && (
                      <p className="text-sm flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <a href={`mailto:${booking.profiles.email}`} className="text-primary hover:underline">
                          {booking.profiles.email}
                        </a>
                      </p>
                    )}
                    {booking.profiles?.phone && (
                      <p className="text-sm flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <a href={`tel:${booking.profiles.phone}`} className="text-primary hover:underline">
                          {booking.profiles.phone}
                        </a>
                      </p>
                    )}
                    {!booking.profiles?.phone && (
                      <p className="text-xs text-muted-foreground italic">No phone number provided</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {booking.status === "confirmed" && (
                      <Button
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, "in_progress")}
                        disabled={updatingBooking === booking.id}
                      >
                        Start Job
                      </Button>
                    )}
                    {booking.status === "in_progress" && (
                      <Button
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, "completed")}
                        disabled={updatingBooking === booking.id}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AddServiceDialog
        open={isAddServiceOpen}
        onOpenChange={setIsAddServiceOpen}
        businessId={businessProfile?.id || ""}
        onServiceAdded={fetchBusinessData}
      />
    </div>
  );
};

export default BusinessDashboard;

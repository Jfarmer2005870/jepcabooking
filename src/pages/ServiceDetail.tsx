import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  MapPin, 
  Star, 
  Clock, 
  CalendarIcon, 
  ArrowLeft,
  CheckCircle,
  Loader2,
  Sparkles,
  Wrench,
  Zap,
  Leaf,
  Paintbrush,
  Truck,
  Hammer,
  Wind,
  Bug
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  cleaning: <Sparkles className="w-5 h-5" />,
  plumbing: <Wrench className="w-5 h-5" />,
  electrical: <Zap className="w-5 h-5" />,
  landscaping: <Leaf className="w-5 h-5" />,
  painting: <Paintbrush className="w-5 h-5" />,
  moving: <Truck className="w-5 h-5" />,
  handyman: <Hammer className="w-5 h-5" />,
  hvac: <Wind className="w-5 h-5" />,
  pest_control: <Bug className="w-5 h-5" />,
  other: <Wrench className="w-5 h-5" />,
};

const categoryLabels: Record<string, string> = {
  cleaning: "Cleaning",
  plumbing: "Plumbing",
  electrical: "Electrical",
  landscaping: "Landscaping",
  painting: "Painting",
  moving: "Moving",
  handyman: "Handyman",
  hvac: "HVAC",
  pest_control: "Pest Control",
  other: "Other",
};

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_min: number | null;
  price_max: number | null;
  price_type: string | null;
  duration_minutes: number | null;
  business_profiles: {
    id: string;
    business_name: string;
    description: string | null;
    city: string | null;
    state: string | null;
    rating: number | null;
    total_reviews: number | null;
    is_verified: boolean | null;
    service_area: string | null;
  };
}

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (id) {
      fetchService();
    }
  }, [id]);

  const fetchService = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          business_profiles (
            id,
            business_name,
            description,
            city,
            state,
            rating,
            total_reviews,
            is_verified,
            service_area
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setService(data);
    } catch (error) {
      console.error("Error fetching service:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (userRole === "business") {
      toast({
        title: "Cannot book as business",
        description: "Business accounts cannot book services. Please use a consumer account.",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Select a date",
        description: "Please select a preferred date for the service.",
        variant: "destructive",
      });
      return;
    }

    setBooking(true);
    try {
      const { error } = await supabase.from("bookings").insert({
        service_id: service!.id,
        consumer_id: user.id,
        business_id: service!.business_profiles.id,
        scheduled_date: format(date, "yyyy-MM-dd"),
        scheduled_time: time || null,
        notes: notes || null,
        total_price: service!.price_min || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Booking requested!",
        description: "The service provider will review your request shortly.",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBooking(false);
    }
  };

  const formatPrice = () => {
    if (!service) return "";
    if (!service.price_min && !service.price_max) return "Get Quote";
    if (service.price_type === "quote") return "Get Quote";
    
    const min = service.price_min ? `$${service.price_min}` : "";
    const max = service.price_max ? `$${service.price_max}` : "";
    const type = service.price_type === "hourly" ? "/hr" : "";
    
    if (min && max && min !== max) return `${min} - ${max}${type}`;
    return `${min || max}${type}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-20 md:pt-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-20 md:pt-24">
          <div className="container mx-auto px-4 py-12 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Service not found</h1>
            <p className="text-muted-foreground mb-6">
              The service you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate("/services")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Services
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20 md:pt-24">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/services")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Services
          </Button>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Service Details */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    {categoryIcons[service.category]}
                    {categoryLabels[service.category]}
                  </Badge>
                  {service.business_profiles.is_verified && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold font-display text-foreground mb-2">
                  {service.title}
                </h1>
                <p className="text-xl font-semibold text-primary">{formatPrice()}</p>
              </div>

              {service.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>About this service</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{service.description}</p>
                    {service.duration_minutes && (
                      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Estimated duration: {service.duration_minutes} minutes
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Business Info */}
              <Card>
                <CardHeader>
                  <CardTitle>About the Provider</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      {service.business_profiles.business_name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {service.business_profiles.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {service.business_profiles.city}, {service.business_profiles.state}
                        </span>
                      )}
                      {service.business_profiles.rating && service.business_profiles.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-accent text-accent" />
                          {service.business_profiles.rating.toFixed(1)}
                          {service.business_profiles.total_reviews && (
                            <span>({service.business_profiles.total_reviews} reviews)</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  {service.business_profiles.description && (
                    <p className="text-muted-foreground">
                      {service.business_profiles.description}
                    </p>
                  )}
                  {service.business_profiles.service_area && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Service Area:</strong> {service.business_profiles.service_area}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Booking Card */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Book this Service</CardTitle>
                  <CardDescription>
                    Request a booking and the provider will confirm
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Preferred Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : "Select a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Preferred Time (optional)</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any specific requirements or details..."
                      rows={3}
                    />
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleBooking}
                    disabled={booking}
                  >
                    {booking ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : user ? (
                      "Request Booking"
                    ) : (
                      "Sign in to Book"
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    You won't be charged until the provider confirms
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ServiceDetail;

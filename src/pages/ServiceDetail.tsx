import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ChatDialog from "@/components/chat/ChatDialog";
import ServiceReviews from "@/components/reviews/ServiceReviews";
import PinDropAddress from "@/components/maps/PinDropAddress";
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
  Bug,
  MessageSquare
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
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [useHomeAddress, setUseHomeAddress] = useState(false);
  const [estimatedHours, setEstimatedHours] = useState<number>(1);
  const [homeAddress, setHomeAddress] = useState<string | null>(null);
  const [homeCoords, setHomeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchService();
    }
  }, [id]);

  // Fetch user's home address
  useEffect(() => {
    const fetchHomeAddress = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("home_address, home_lat, home_lng")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data?.home_address) {
        setHomeAddress(data.home_address);
        const d = data as any;
        if (d.home_lat != null && d.home_lng != null) {
          setHomeCoords({ lat: d.home_lat, lng: d.home_lng });
        }
      }
    };
    
    fetchHomeAddress();
  }, [user]);

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

    if (!time) {
      toast({
        title: "Select a time",
        description: "Please select a preferred time for the service.",
        variant: "destructive",
      });
      return;
    }

    const serviceAddress = useHomeAddress && homeAddress ? homeAddress : address.trim();
    
    if (!serviceAddress) {
      toast({
        title: "Enter service address",
        description: "Please enter the address where the service will be performed.",
        variant: "destructive",
      });
      return;
    }

    setBooking(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-booking-checkout", {
        body: {
          service_id: service!.id,
          scheduled_date: format(date, "yyyy-MM-dd"),
          scheduled_time: time,
          service_address: serviceAddress,
          notes: notes || null,
          estimated_hours: service!.price_type === "hourly" ? estimatedHours : null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create booking. Please try again.",
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
    
    const fee = 1.05; // 5% platform fee
    const min = service.price_min ? `$${(service.price_min * fee).toFixed(2)}` : "";
    const max = service.price_max ? `$${(service.price_max * fee).toFixed(2)}` : "";
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
                      {!!service.business_profiles.rating && service.business_profiles.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-accent text-accent" />
                          {service.business_profiles.rating.toFixed(1)}
                          {!!service.business_profiles.total_reviews && service.business_profiles.total_reviews > 0 && (
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
                  
                  {/* Message Business Button */}
                  {user && userRole === "consumer" && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => setIsChatOpen(true)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message Business
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Reviews Dropdown */}
              <ServiceReviews businessId={service.business_profiles.id} />
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
                    <Label>Preferred Time <span className="text-destructive">*</span></Label>
                    <Select value={time} onValueChange={setTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="08:00">8:00 AM</SelectItem>
                        <SelectItem value="08:30">8:30 AM</SelectItem>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="09:30">9:30 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="10:30">10:30 AM</SelectItem>
                        <SelectItem value="11:00">11:00 AM</SelectItem>
                        <SelectItem value="11:30">11:30 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="12:30">12:30 PM</SelectItem>
                        <SelectItem value="13:00">1:00 PM</SelectItem>
                        <SelectItem value="13:30">1:30 PM</SelectItem>
                        <SelectItem value="14:00">2:00 PM</SelectItem>
                        <SelectItem value="14:30">2:30 PM</SelectItem>
                        <SelectItem value="15:00">3:00 PM</SelectItem>
                        <SelectItem value="15:30">3:30 PM</SelectItem>
                        <SelectItem value="16:00">4:00 PM</SelectItem>
                        <SelectItem value="16:30">4:30 PM</SelectItem>
                        <SelectItem value="17:00">5:00 PM</SelectItem>
                        <SelectItem value="17:30">5:30 PM</SelectItem>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Service Address <span className="text-destructive">*</span></Label>
                    
                    {/* Home address toggle */}
                    {homeAddress && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                        <input
                          type="checkbox"
                          id="useHomeAddress"
                          checked={useHomeAddress}
                          onChange={(e) => {
                            setUseHomeAddress(e.target.checked);
                            if (e.target.checked) {
                              setAddress("");
                            }
                          }}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <label htmlFor="useHomeAddress" className="text-sm text-foreground">
                          Use my home address
                        </label>
                      </div>
                    )}
                    
                    {useHomeAddress && homeAddress ? (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                        <p className="text-sm text-foreground">{homeAddress}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          From your profile settings
                        </p>
                      </div>
                    ) : (
                      <PinDropAddress
                        value={address}
                        onChange={(addr) => setAddress(addr)}
                      />
                    )}
                    
                    {!homeAddress && (
                      <p className="text-xs text-muted-foreground">
                        Tip: Save your home address in your profile for faster booking
                      </p>
                    )}
                  </div>

                  {/* Estimated Hours (for hourly services) */}
                  {service.price_type === "hourly" && (
                    <div className="space-y-2">
                      <Label htmlFor="hours">Estimated Hours <span className="text-destructive">*</span></Label>
                      <Input
                        id="hours"
                        type="number"
                        min={1}
                        max={24}
                        step={0.5}
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(Math.max(0.5, parseFloat(e.target.value) || 1))}
                      />
                      <p className="text-xs text-muted-foreground">
                        How many hours do you estimate the job will take?
                      </p>
                    </div>
                  )}

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

                  {/* Price breakdown */}
                  {service.price_min && (
                    <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                      {service.price_type === "hourly" ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Hourly rate</span>
                            <span className="text-foreground">${service.price_min.toFixed(2)}/hr</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Estimated hours</span>
                            <span className="text-foreground">{estimatedHours} hr{estimatedHours !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="text-foreground">${(service.price_min * estimatedHours).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform fee (5%)</span>
                            <span className="text-foreground">${(service.price_min * estimatedHours * 0.05).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t border-border pt-1">
                            <span className="text-foreground">Total</span>
                            <span className="text-primary">${(service.price_min * estimatedHours * 1.05).toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Service price</span>
                            <span className="text-foreground">${service.price_min.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform fee (5%)</span>
                            <span className="text-foreground">${(service.price_min * 0.05).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t border-border pt-1">
                            <span className="text-foreground">Total</span>
                            <span className="text-primary">${(service.price_min * 1.05).toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleBooking}
                    disabled={booking}
                  >
                    {booking ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : user ? (
                      "Book & Pay Now"
                    ) : (
                      "Sign in to Book"
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Secure payment processed via Stripe
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* Chat Dialog */}
      {service && (
        <ChatDialog
          open={isChatOpen}
          onOpenChange={setIsChatOpen}
          businessId={service.business_profiles.id}
          businessName={service.business_profiles.business_name}
        />
      )}
    </div>
  );
};

export default ServiceDetail;

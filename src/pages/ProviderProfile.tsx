import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ServiceReviews from "@/components/reviews/ServiceReviews";
import {
  MapPin,
  Star,
  ShieldCheck,
  Globe,
  Clock,
  ArrowRight,
} from "lucide-react";

interface BusinessProfile {
  id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  service_area: string | null;
  is_verified: boolean | null;
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
}

interface AvailabilityRow {
  weekday: number;
  start_time: string;
  end_time: string;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatPrice = (s: Service) => {
  if (!s.price_min && !s.price_max) return "Get Quote";
  if (s.price_type === "quote") return "Get Quote";
  const fee = 1.05;
  const min = s.price_min ? `$${(s.price_min * fee).toFixed(2)}` : "";
  const max = s.price_max ? `$${(s.price_max * fee).toFixed(2)}` : "";
  const type = s.price_type === "hourly" ? "/hr" : "";
  if (min && max && min !== max) return `${min} - ${max}${type}`;
  return `${min || max}${type}`;
};

const fmtTime = (t: string) => {
  // t like "08:00:00"
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
};

const ProviderProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: bp }, { data: svc }, { data: av }] = await Promise.all([
        supabase
          .from("business_profiles")
          .select("id, business_name, description, logo_url, website, city, state, service_area, is_verified, rating, total_reviews")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("services")
          .select("id, title, description, category, price_min, price_max, price_type")
          .eq("business_id", id)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("provider_availability")
          .select("weekday, start_time, end_time")
          .eq("business_id", id)
          .order("weekday", { ascending: true }),
      ]);
      if (!active) return;
      if (!bp) {
        setNotFound(true);
      } else {
        setProfile(bp as BusinessProfile);
        setServices((svc || []) as Service[]);
        setAvailability((av || []) as AvailabilityRow[]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-24 container mx-auto px-4 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-24 container mx-auto px-4 text-center py-16">
          <h1 className="text-2xl font-bold font-display mb-2">Provider not found</h1>
          <p className="text-muted-foreground mb-6">This provider profile is unavailable or has been removed.</p>
          <Button asChild>
            <Link to="/services">Browse providers</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={`${profile.business_name} — Jepca`}
        description={profile.description?.slice(0, 155) || `Book ${profile.business_name} on Jepca.`}
      />
      <Header />
      <main className="flex-1 pt-20 md:pt-24">
        {/* Hero */}
        <section className="gradient-hero py-10 md:py-14 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden shrink-0">
                {profile.logo_url ? (
                  <img src={profile.logo_url} alt={`${profile.business_name} logo`} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold font-display text-primary">
                    {profile.business_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
                    {profile.business_name}
                  </h1>
                  {profile.is_verified && (
                    <Badge variant="secondary" className="gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Verified
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                  {!!profile.rating && profile.rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-accent text-accent" />
                      {profile.rating.toFixed(1)}
                      {!!profile.total_reviews && profile.total_reviews > 0 && (
                        <span>({profile.total_reviews} reviews)</span>
                      )}
                    </span>
                  )}
                  {(profile.city || profile.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {[profile.city, profile.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Globe className="w-4 h-4" /> Website
                    </a>
                  )}
                </div>
                {profile.description && (
                  <p className="text-foreground/80 max-w-2xl">{profile.description}</p>
                )}
                {profile.service_area && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Service area: {profile.service_area}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8 grid gap-8 lg:grid-cols-3">
          {/* Services */}
          <section className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold font-display">Services offered</h2>
            {services.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  This provider hasn't listed any services yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((s) => (
                  <Card key={s.id} className="hover:shadow-medium transition-shadow flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">{s.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      {s.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{s.description}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="font-semibold text-primary">{formatPrice(s)}</span>
                        <Button size="sm" asChild>
                          <Link to={`/services/${s.id}`}>
                            Book <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="pt-4">
              <ServiceReviews businessId={profile.id} />
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Operating hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availability.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Hours not set. Contact provider for availability.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {WEEKDAYS.map((day, i) => {
                      const slots = availability.filter((a) => a.weekday === i);
                      return (
                        <li key={day} className="flex justify-between">
                          <span className="text-foreground">{day}</span>
                          <span className="text-muted-foreground">
                            {slots.length === 0
                              ? "Closed"
                              : slots.map((s) => `${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`).join(", ")}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderProfile;

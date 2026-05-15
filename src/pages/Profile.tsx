import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Save, Loader2 } from "lucide-react";
import { profileSchema, businessProfileSchema, validateForm } from "@/lib/validations";
import PaymentMethods from "@/components/profile/PaymentMethods";
import PinDropAddress from "@/components/maps/PinDropAddress";

interface ProfileData {
  full_name: string;
  phone: string;
  bio: string;
  avatar_url: string;
  home_address: string;
  home_lat: number | null;
  home_lng: number | null;
}

interface BusinessProfileData {
  business_name: string;
  description: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  service_area: string;
  origin_lat: number | null;
  origin_lng: number | null;
  free_radius_miles: number;
  per_mile_rate: number;
}

const Profile = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    phone: "",
    bio: "",
    avatar_url: "",
    home_address: "",
    home_lat: null,
    home_lng: null,
  });
  const [businessProfile, setBusinessProfile] = useState<BusinessProfileData>({
    business_name: "",
    description: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    service_area: "",
    origin_lat: null,
    origin_lng: null,
    free_radius_miles: 10,
    per_mile_rate: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Error fetching profile:", profileError);
        }

        if (profileData) {
          setProfile({
            full_name: profileData.full_name || "",
            phone: profileData.phone || "",
            bio: profileData.bio || "",
            avatar_url: profileData.avatar_url || "",
            home_address: profileData.home_address || "",
            home_lat: (profileData as any).home_lat ?? null,
            home_lng: (profileData as any).home_lng ?? null,
          });
        }

        // Fetch business profile if business user
        if (userRole === "business") {
          const { data: businessRows, error: businessError } = await supabase
            .rpc("get_my_business_profile");
          const businessData = businessRows?.[0] ?? null;

          if (businessError && businessError.code !== "PGRST116") {
            console.error("Error fetching business profile:", businessError);
          }

          if (businessData) {
            const bd = businessData as any;
            setBusinessProfile({
              business_name: businessData.business_name || "",
              description: businessData.description || "",
              website: businessData.website || "",
              address: businessData.address || "",
              city: businessData.city || "",
              state: businessData.state || "",
              zip_code: businessData.zip_code || "",
              service_area: businessData.service_area || "",
              origin_lat: bd.origin_lat ?? null,
              origin_lng: bd.origin_lng ?? null,
              free_radius_miles: bd.free_radius_miles != null ? Number(bd.free_radius_miles) : 10,
              per_mile_rate: bd.per_mile_rate != null ? Number(bd.per_mile_rate) : 0,
            });
          }
        }
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error loading profile",
          description: "Could not load your profile data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user, userRole, toast]);

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate profile data
    const profileValidation = validateForm(profileSchema, {
      full_name: profile.full_name,
      phone: profile.phone,
      bio: profile.bio,
    });

    if (!profileValidation.success) {
      setErrors(profileValidation.errors || {});
      toast({
        title: "Validation error",
        description: "Please fix the errors below.",
        variant: "destructive",
      });
      return;
    }

    // Validate business profile if applicable
    if (userRole === "business") {
      const businessValidation = validateForm(businessProfileSchema, businessProfile);
      if (!businessValidation.success) {
        setErrors(businessValidation.errors || {});
        toast({
          title: "Validation error",
          description: "Please fix the errors below.",
          variant: "destructive",
        });
        return;
      }
    }

    setErrors({});
    setSaving(true);

    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name || null,
          phone: profile.phone || null,
          bio: profile.bio || null,
          avatar_url: profile.avatar_url || null,
          home_address: profile.home_address || null,
          home_lat: profile.home_lat,
          home_lng: profile.home_lng,
        } as any)
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update business profile if applicable
      if (userRole === "business") {
        const { error: businessError } = await supabase
          .from("business_profiles")
          .update({
            business_name: businessProfile.business_name,
            description: businessProfile.description || null,
            website: businessProfile.website || null,
            address: businessProfile.address || null,
            city: businessProfile.city || null,
            state: businessProfile.state || null,
            zip_code: businessProfile.zip_code || null,
            service_area: businessProfile.service_area || null,
            origin_lat: businessProfile.origin_lat,
            origin_lng: businessProfile.origin_lng,
            free_radius_miles: businessProfile.free_radius_miles,
            per_mile_rate: businessProfile.per_mile_rate,
          } as any)
          .eq("user_id", user.id);

        if (businessError) throw businessError;
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
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
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-display text-foreground">Profile Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your account information</p>
          </div>

          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Your basic profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="John Doe"
                      className={errors.full_name ? "border-destructive" : ""}
                    />
                    {errors.full_name && (
                      <p className="text-sm text-destructive">{errors.full_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className={errors.phone ? "border-destructive" : ""}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us a bit about yourself..."
                    rows={3}
                    className={errors.bio ? "border-destructive" : ""}
                  />
                  {errors.bio && (
                    <p className="text-sm text-destructive">{errors.bio}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{profile.bio.length}/500 characters</p>
                </div>

                {/* Home Address - only for consumers */}
                {userRole === "consumer" && (
                  <div className="space-y-2">
                    <Label>Home Address</Label>
                    <PinDropAddress
                      value={profile.home_address}
                      initialCoords={profile.home_lat != null && profile.home_lng != null ? { lat: profile.home_lat, lng: profile.home_lng } : undefined}
                      onChange={(addr, coords) => setProfile({
                        ...profile,
                        home_address: addr,
                        home_lat: coords?.lat ?? profile.home_lat,
                        home_lng: coords?.lng ?? profile.home_lng,
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Drop a pin or search to save your home address for faster booking
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Information */}
            {userRole === "business" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Business Information
                  </CardTitle>
                  <CardDescription>
                    Details about your business
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={businessProfile.business_name}
                        onChange={(e) => setBusinessProfile({ ...businessProfile, business_name: e.target.value })}
                        placeholder="Acme Services LLC"
                        className={errors.business_name ? "border-destructive" : ""}
                      />
                      {errors.business_name && (
                        <p className="text-sm text-destructive">{errors.business_name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={businessProfile.website}
                        onChange={(e) => setBusinessProfile({ ...businessProfile, website: e.target.value })}
                        placeholder="https://example.com"
                        className={errors.website ? "border-destructive" : ""}
                      />
                      {errors.website && (
                        <p className="text-sm text-destructive">{errors.website}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Business Description</Label>
                    <Textarea
                      id="description"
                      value={businessProfile.description}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, description: e.target.value })}
                      placeholder="Describe your business and services..."
                      rows={3}
                      className={errors.description ? "border-destructive" : ""}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive">{errors.description}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={businessProfile.address}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, address: e.target.value })}
                      placeholder="123 Main St"
                      className={errors.address ? "border-destructive" : ""}
                    />
                    {errors.address && (
                      <p className="text-sm text-destructive">{errors.address}</p>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={businessProfile.city}
                        onChange={(e) => setBusinessProfile({ ...businessProfile, city: e.target.value })}
                        placeholder="San Francisco"
                        className={errors.city ? "border-destructive" : ""}
                      />
                      {errors.city && (
                        <p className="text-sm text-destructive">{errors.city}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={businessProfile.state}
                        onChange={(e) => setBusinessProfile({ ...businessProfile, state: e.target.value })}
                        placeholder="CA"
                        className={errors.state ? "border-destructive" : ""}
                      />
                      {errors.state && (
                        <p className="text-sm text-destructive">{errors.state}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={businessProfile.zip_code}
                        onChange={(e) => setBusinessProfile({ ...businessProfile, zip_code: e.target.value })}
                        placeholder="94102"
                        className={errors.zip_code ? "border-destructive" : ""}
                      />
                      {errors.zip_code && (
                        <p className="text-sm text-destructive">{errors.zip_code}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceArea">Service Area</Label>
                    <Input
                      id="serviceArea"
                      value={businessProfile.service_area}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, service_area: e.target.value })}
                      placeholder="San Francisco Bay Area"
                      className={errors.service_area ? "border-destructive" : ""}
                    />
                    {errors.service_area && (
                      <p className="text-sm text-destructive">{errors.service_area}</p>
                    )}
                  </div>

                  {/* Travel pricing */}
                  <div className="space-y-3 border-t border-border pt-4">
                    <div>
                      <Label>Dispatch Origin</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Drop a pin where you start your jobs from. Travel fees are calculated from here.
                      </p>
                      <PinDropAddress
                        value={businessProfile.address || ""}
                        initialCoords={
                          businessProfile.origin_lat != null && businessProfile.origin_lng != null
                            ? { lat: businessProfile.origin_lat, lng: businessProfile.origin_lng }
                            : undefined
                        }
                        onChange={(_addr, c) =>
                          setBusinessProfile({
                            ...businessProfile,
                            origin_lat: c?.lat ?? businessProfile.origin_lat,
                            origin_lng: c?.lng ?? businessProfile.origin_lng,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="freeRadius">Free travel radius (miles)</Label>
                        <Input
                          id="freeRadius"
                          type="number"
                          min={0}
                          step={0.5}
                          value={businessProfile.free_radius_miles}
                          onChange={(e) =>
                            setBusinessProfile({
                              ...businessProfile,
                              free_radius_miles: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">No travel charge inside this radius.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="perMile">Rate per extra mile ($)</Label>
                        <Input
                          id="perMile"
                          type="number"
                          min={0}
                          step={0.25}
                          value={businessProfile.per_mile_rate}
                          onChange={(e) =>
                            setBusinessProfile({
                              ...businessProfile,
                              per_mile_rate: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">Charged per mile beyond the free radius.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {userRole === "consumer" && <PaymentMethods />}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">App tour</CardTitle>
                <CardDescription>Re-run the welcome guide anytime.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    try { localStorage.removeItem("jepca_onboarding_seen_v3"); } catch {}
                    navigate("/");
                    setTimeout(() => window.dispatchEvent(new CustomEvent("jepca:start-onboarding")), 350);
                  }}
                >
                  Show app tour again
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button 
                type="button"
                onClick={() => {
                  console.log("Button clicked");
                  handleSaveProfile();
                }} 
                disabled={saving}
                size="lg"
                className="min-w-[160px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
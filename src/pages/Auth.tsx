import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Building2, User, ArrowLeft } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

type AuthMode = "login" | "signup";
type UserType = "consumer" | "business";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { signIn, signUp, user, loading } = useAuth();
  const requestedRedirect = searchParams.get("redirect");
  const redirectPath = requestedRedirect?.startsWith("/") ? requestedRedirect : "/dashboard";

  const [mode, setMode] = useState<AuthMode>("login");
  const [userType, setUserType] = useState<UserType | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate(redirectPath);
    }
  }, [user, loading, navigate, redirectPath]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (mode === "signup") {
      if (!fullName.trim()) {
        newErrors.fullName = "Full name is required";
      }
      if (userType === "business" && !businessName.trim()) {
        newErrors.businessName = "Business name is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Login failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
          navigate(redirectPath);
        }
      } else {
        if (!userType) {
          toast({
            title: "Please select account type",
            description: "Choose whether you're a consumer or business.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await signUp(
          email,
          password,
          fullName,
          userType,
          userType === "business" ? businessName : undefined
        );

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please log in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Account created!",
            description: "Welcome to Jepca. Your account is ready.",
          });
          navigate(redirectPath);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setBusinessName("");
    setErrors({});
    setUserType(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary-glow/80" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <a href="/" className="flex items-center gap-3 mb-12">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-bold text-3xl font-display">J</span>
            </div>
            <span className="text-3xl font-bold font-display text-white">Jepca</span>
          </a>
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 font-display leading-tight">
            Connect with top
            <br />
            service providers
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Book trusted professionals for all your home and business needs. From cleaning to repairs, we've got you covered.
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-20 -right-10 w-60 h-60 bg-white/5 rounded-full blur-2xl" />
      </div>

      {/* Right side - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <a href="/" className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl font-display">J</span>
            </div>
            <span className="text-xl font-bold font-display text-foreground">Jepca</span>
          </a>

          <AnimatePresence mode="wait">
            {mode === "signup" && userType === null ? (
              <motion.div
                key="user-type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold font-display text-foreground">Create your account</h2>
                  <p className="text-muted-foreground mt-2">What type of account do you need?</p>
                </div>

                <div className="grid gap-4">
                  <button
                    onClick={() => setUserType("consumer")}
                    className="flex items-center gap-4 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-secondary/50 transition-all text-left group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <User className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">I need services</h3>
                      <p className="text-sm text-muted-foreground">Book trusted professionals for your needs</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setUserType("business")}
                    className="flex items-center gap-4 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-secondary/50 transition-all text-left group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Building2 className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">I provide services</h3>
                      <p className="text-sm text-muted-foreground">Grow your business and find new clients</p>
                    </div>
                  </button>
                </div>

                <p className="text-center text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("login");
                      resetForm();
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Log in
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {mode === "signup" && userType && (
                  <button
                    onClick={() => setUserType(null)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}

                <div>
                  <h2 className="text-2xl font-bold font-display text-foreground">
                    {mode === "login" ? "Welcome back" : `Create ${userType} account`}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {mode === "login"
                      ? "Enter your credentials to access your account"
                      : "Fill in your details to get started"}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={errors.fullName ? "border-destructive" : ""}
                        />
                        {errors.fullName && (
                          <p className="text-sm text-destructive">{errors.fullName}</p>
                        )}
                      </div>

                      {userType === "business" && (
                        <div className="space-y-2">
                          <Label htmlFor="businessName">Business Name</Label>
                          <Input
                            id="businessName"
                            type="text"
                            placeholder="Acme Services LLC"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className={errors.businessName ? "border-destructive" : ""}
                          />
                          {errors.businessName && (
                            <p className="text-sm text-destructive">{errors.businessName}</p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={errors.password ? "border-destructive pr-10" : "pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></span>
                        {mode === "login" ? "Logging in..." : "Creating account..."}
                      </span>
                    ) : mode === "login" ? (
                      "Log in"
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </form>

                <p className="text-center text-muted-foreground">
                  {mode === "login" ? (
                    <>
                      Don't have an account?{" "}
                      <button
                        onClick={() => {
                          setMode("signup");
                          resetForm();
                        }}
                        className="text-primary hover:underline font-medium"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => {
                          setMode("login");
                          resetForm();
                        }}
                        className="text-primary hover:underline font-medium"
                      >
                        Log in
                      </button>
                    </>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Auth;

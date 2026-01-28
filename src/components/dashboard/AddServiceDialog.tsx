import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { serviceSchema, validateForm } from "@/lib/validations";

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onServiceAdded: () => void;
}

const categories = [
  { value: "cleaning", label: "Cleaning" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "landscaping", label: "Landscaping" },
  { value: "painting", label: "Painting" },
  { value: "moving", label: "Moving" },
  { value: "handyman", label: "Handyman" },
  { value: "hvac", label: "HVAC" },
  { value: "pest_control", label: "Pest Control" },
  { value: "other", label: "Other" },
] as const;

const priceTypes = [
  { value: "fixed", label: "Fixed Price" },
  { value: "hourly", label: "Hourly Rate" },
  { value: "quote", label: "Request Quote" },
] as const;

type CategoryValue = typeof categories[number]["value"];
type PriceTypeValue = typeof priceTypes[number]["value"];

const AddServiceDialog = ({ open, onOpenChange, businessId, onServiceAdded }: AddServiceDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other" as CategoryValue,
    price_type: "fixed" as PriceTypeValue,
    price_min: "",
    price_max: "",
    duration_minutes: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "other",
      price_type: "fixed",
      price_min: "",
      price_max: "",
      duration_minutes: "",
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare data for validation
    const dataToValidate = {
      title: formData.title,
      description: formData.description || undefined,
      category: formData.category,
      price_type: formData.price_type,
      price_min: formData.price_min ? parseFloat(formData.price_min) : undefined,
      price_max: formData.price_max ? parseFloat(formData.price_max) : undefined,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
    };

    const validation = validateForm(serviceSchema, dataToValidate);
    
    if (!validation.success) {
      setErrors(validation.errors || {});
      toast({
        title: "Validation error",
        description: "Please fix the errors below.",
        variant: "destructive",
      });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { error } = await supabase.from("services").insert({
        business_id: businessId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        price_type: formData.price_type,
        price_min: formData.price_min ? parseFloat(formData.price_min) : null,
        price_max: formData.price_max ? parseFloat(formData.price_max) : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: "Service added",
        description: "Your service has been created successfully.",
      });

      resetForm();
      onOpenChange(false);
      onServiceAdded();
    } catch (error) {
      console.error("Error adding service:", error);
      toast({
        title: "Error",
        description: "Failed to add service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Service</DialogTitle>
          <DialogDescription>
            Create a new service listing for your business
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Service Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Deep House Cleaning"
              className={errors.title ? "border-destructive" : ""}
              maxLength={100}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what's included in this service..."
              rows={3}
              className={errors.description ? "border-destructive" : ""}
              maxLength={1000}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground">{formData.description.length}/1000 characters</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value: CategoryValue) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceType">Pricing Type</Label>
              <Select
                value={formData.price_type}
                onValueChange={(value: PriceTypeValue) => setFormData({ ...formData, price_type: value })}
              >
                <SelectTrigger className={errors.price_type ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priceTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.price_type && (
                <p className="text-sm text-destructive">{errors.price_type}</p>
              )}
            </div>
          </div>

          {formData.price_type !== "quote" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priceMin">
                  {formData.price_type === "hourly" ? "Hourly Rate ($)" : "Min Price ($)"}
                </Label>
                <Input
                  id="priceMin"
                  type="number"
                  min="0"
                  max="999999.99"
                  step="0.01"
                  value={formData.price_min}
                  onChange={(e) => setFormData({ ...formData, price_min: e.target.value })}
                  placeholder="0.00"
                  className={errors.price_min ? "border-destructive" : ""}
                />
                {errors.price_min && (
                  <p className="text-sm text-destructive">{errors.price_min}</p>
                )}
              </div>

              {formData.price_type === "fixed" && (
                <div className="space-y-2">
                  <Label htmlFor="priceMax">Max Price ($)</Label>
                  <Input
                    id="priceMax"
                    type="number"
                    min="0"
                    max="999999.99"
                    step="0.01"
                    value={formData.price_max}
                    onChange={(e) => setFormData({ ...formData, price_max: e.target.value })}
                    placeholder="0.00"
                    className={errors.price_max ? "border-destructive" : ""}
                  />
                  {errors.price_max && (
                    <p className="text-sm text-destructive">{errors.price_max}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="duration">Estimated Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="1440"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              placeholder="e.g., 120"
              className={errors.duration_minutes ? "border-destructive" : ""}
            />
            {errors.duration_minutes && (
              <p className="text-sm text-destructive">{errors.duration_minutes}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Service"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddServiceDialog;
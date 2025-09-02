import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SubscriptionPlan, InsertSubscriptionPlan } from "@shared/schema";

interface PlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: SubscriptionPlan | null;
  mode: "create" | "edit";
}

export default function PlanDialog({ isOpen, onClose, plan, mode }: PlanDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    speedMbps: "",
    durationHours: "",
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (plan && mode === "edit") {
      setFormData({
        name: plan.name,
        price: plan.price.toString(),
        speedMbps: plan.speedMbps.toString(),
        durationHours: plan.durationHours.toString(),
        isActive: plan.isActive,
      });
    } else if (mode === "create") {
      setFormData({
        name: "",
        price: "",
        speedMbps: "",
        durationHours: "",
        isActive: true,
      });
    }
  }, [plan, mode, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: InsertSubscriptionPlan) => {
      const url = mode === "create" ? "/api/admin/plans" : `/api/admin/plans/${plan?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: mode === "create" ? "Plan Created" : "Plan Updated",
        description: `Successfully ${mode === "create" ? "created" : "updated"} the subscription plan.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${mode} plan`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price || !formData.speedMbps || !formData.durationHours) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(formData.price);
    const speedMbps = parseInt(formData.speedMbps);
    const durationHours = parseInt(formData.durationHours);

    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(speedMbps) || speedMbps <= 0) {
      toast({
        title: "Invalid Speed",
        description: "Please enter a valid speed in Mbps",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(durationHours) || durationHours <= 0) {
      toast({
        title: "Invalid Duration",
        description: "Please enter a valid duration in hours",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      name: formData.name.trim(),
      price: price.toString(),
      speedMbps,
      durationHours,
      isActive: formData.isActive,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Plan" : "Edit Plan"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Basic Plan"
              data-testid="input-plan-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan-price">Price (KES)</Label>
              <Input
                id="plan-price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="100"
                min="1"
                step="0.01"
                data-testid="input-plan-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-speed">Speed (Mbps)</Label>
              <Input
                id="plan-speed"
                type="number"
                value={formData.speedMbps}
                onChange={(e) => setFormData({ ...formData, speedMbps: e.target.value })}
                placeholder="10"
                min="1"
                data-testid="input-plan-speed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-duration">Duration (Hours)</Label>
            <Input
              id="plan-duration"
              type="number"
              value={formData.durationHours}
              onChange={(e) => setFormData({ ...formData, durationHours: e.target.value })}
              placeholder="24"
              min="1"
              data-testid="input-plan-duration"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="plan-active"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              data-testid="switch-plan-active"
            />
            <Label htmlFor="plan-active">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              data-testid="button-save-plan"
            >
              {mutation.isPending ? "Saving..." : mode === "create" ? "Create Plan" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
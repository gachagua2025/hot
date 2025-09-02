import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Wifi, Plus } from "lucide-react";
import PlanDialog from "@/components/plan-dialog";
import DeletePlanDialog from "@/components/delete-plan-dialog";
import type { SubscriptionPlan } from "@shared/schema";

export default function PlansManagement() {
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/admin/plans'],
  });

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setDialogMode("create");
    setPlanDialogOpen(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setDialogMode("edit");
    setPlanDialogOpen(true);
  };

  const handleDeletePlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Subscription Plans
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                    <div className="h-3 bg-slate-200 rounded w-20"></div>
                  </div>
                  <div className="h-4 bg-slate-200 rounded w-16"></div>
                  <div className="h-4 bg-slate-200 rounded w-16"></div>
                  <div className="h-4 bg-slate-200 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getIconColor = (index: number) => {
    const colors = [
      "bg-primary/10 text-primary",
      "bg-success/10 text-success", 
      "bg-warning/10 text-warning"
    ];
    return colors[index % colors.length];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Subscription Plans
          </CardTitle>
          <Button 
            variant="ghost" 
            className="text-primary hover:text-primary/80 font-medium text-sm"
            onClick={handleCreatePlan}
            data-testid="button-create-plan"
          >
            <Plus className="mr-1 w-4 h-4" />
            Create Plan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Plan Name</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Price</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Duration</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans?.map((plan, index) => (
                <tr key={plan.id} className="border-b border-slate-100" data-testid={`plan-row-${plan.id}`}>
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${getIconColor(index)}`}>
                        <Wifi className="text-sm w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900" data-testid={`plan-name-${plan.id}`}>
                          {plan.name}
                        </p>
                        <p className="text-sm text-slate-500" data-testid={`plan-speed-${plan.id}`}>
                          {plan.speedMbps} Mbps
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-900" data-testid={`plan-price-${plan.id}`}>
                    KES {plan.price}
                  </td>
                  <td className="py-4 px-4 text-slate-600" data-testid={`plan-duration-${plan.id}`}>
                    {plan.durationHours >= 24 
                      ? `${Math.floor(plan.durationHours / 24)} Day${Math.floor(plan.durationHours / 24) > 1 ? 's' : ''}`
                      : `${plan.durationHours} Hours`
                    }
                  </td>
                  <td className="py-4 px-4">
                    <Badge 
                      className={plan.isActive ? "bg-success/10 text-success" : "bg-slate-100 text-slate-600"}
                      data-testid={`plan-status-${plan.id}`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-slate-400 hover:text-primary"
                        onClick={() => handleEditPlan(plan)}
                        data-testid={`button-edit-plan-${plan.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-slate-400 hover:text-destructive"
                        onClick={() => handleDeletePlan(plan)}
                        data-testid={`button-delete-plan-${plan.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <PlanDialog
        isOpen={planDialogOpen}
        onClose={() => setPlanDialogOpen(false)}
        plan={selectedPlan}
        mode={dialogMode}
      />

      <DeletePlanDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        plan={selectedPlan}
      />
    </Card>
  );
}

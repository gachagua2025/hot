import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import type { SubscriptionPlan } from "../../shared/schema";

interface DeletePlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
}

export default function DeletePlanDialog({ isOpen, onClose, plan }: DeletePlanDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/plans/${planId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Plan Deleted",
        description: "The subscription plan has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete the plan",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (plan) {
      deleteMutation.mutate(plan.id);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Plan</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{plan?.name}"? This action cannot be undone.
            Any active users with this plan will lose internet access.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Plan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
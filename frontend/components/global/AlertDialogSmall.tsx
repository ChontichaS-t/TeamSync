import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import React from "react";

export type AlertDialogSmallProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  cancelText?: string;
  actionText?: string;
  onAction?: () => void;
  variant?: "default" | "destructive";
  actionBgColor?: string;
  actionClassName?: string;
};

export function AlertDialogSmall({
  open,
  onOpenChange,
  trigger,
  title = "ยืนยันการดำเนินการ",
  description = "คุณแน่ใจหรือไม่ว่าต้องการดำเนินการนี้?",
  cancelText = "ยกเลิก",
  actionText = "ตกลง",
  onAction,
  variant = "default",
  actionBgColor,
  actionClassName,
}: AlertDialogSmallProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            className={actionClassName}
            onClick={onAction}
            style={{
              backgroundColor: actionBgColor || (variant === "destructive" ? "#ef4444" : undefined),
              color: "#ffffff"
            }}
          >
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

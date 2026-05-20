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
  AlertDialogOverlay,
  AlertDialogPortal,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DeleteConfirmDialog({ onConfirm, itemName }) {
  const { t } = useLanguage();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogOverlay className="alert-dialog-overlay" />
        <AlertDialogContent className="alert-dialog-content">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.del_title}</AlertDialogTitle>
            <AlertDialogDescription className="alert-dialog-description">
              {t.del_desc(itemName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="alert-dialog-footer">
            <AlertDialogCancel className="alert-dialog-cancel">{t.btn_cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} className="alert-dialog-action">
              {t.del_confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
 

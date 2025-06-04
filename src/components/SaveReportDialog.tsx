
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useReportDuplicateCheck } from '@/hooks/useReportDuplicateCheck';
import { SelectedFilters } from '@/hooks/useDashboardFilters';

interface SaveReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  isLoading?: boolean;
  currentFilters?: SelectedFilters;
}

export function SaveReportDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  isLoading,
  currentFilters 
}: SaveReportDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const { data: duplicateReports = [] } = useReportDuplicateCheck(
    currentFilters || {
      provinces: [],
      cities: [],
      firms: [],
      branches: [],
      teams: [],
      favoriteLists: [],
      reports: []
    },
    isOpen
  );

  useEffect(() => {
    setShowDuplicateWarning(duplicateReports.length > 0);
  }, [duplicateReports]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), description.trim());
      setName('');
      setDescription('');
      setShowDuplicateWarning(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setShowDuplicateWarning(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save as Report</DialogTitle>
          <DialogDescription>
            Save your current filtered results as a report for future reference.
          </DialogDescription>
        </DialogHeader>
        
        {showDuplicateWarning && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You already have {duplicateReports.length} report{duplicateReports.length !== 1 ? 's' : ''} with identical filters:
              <ul className="mt-1 ml-4 list-disc">
                {duplicateReports.map((report) => (
                  <li key={report.id} className="text-sm">"{report.name}"</li>
                ))}
              </ul>
              Consider using a different name or updating an existing report.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Report Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter report name..."
              className="col-span-3"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter report description..."
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

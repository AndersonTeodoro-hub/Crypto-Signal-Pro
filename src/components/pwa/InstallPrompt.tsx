import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InstallPromptProps {
  variant?: 'button' | 'icon';
  className?: string;
}

export function InstallPrompt({ variant = 'button', className = '' }: InstallPromptProps) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else if (canInstall) {
      await promptInstall();
    }
  };

  // Only show if installable or on iOS (for instructions)
  if (!canInstall && !isIOS) return null;

  return (
    <>
      {variant === 'button' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className={className}
        >
          <Download className="h-4 w-4 mr-2" />
          Install App
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className={className}
          title="Install App"
        >
          <Download className="h-5 w-5" />
        </Button>
      )}

      {/* iOS Installation Instructions Modal */}
      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Install Crypto Signal Pro
            </DialogTitle>
            <DialogDescription>
              Follow these steps to install the app on your iOS device
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                1
              </div>
              <div>
                <p className="font-medium">Tap the Share button</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Look for the <Share className="h-4 w-4 inline" /> icon at the bottom of Safari
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                2
              </div>
              <div>
                <p className="font-medium">Scroll and tap "Add to Home Screen"</p>
                <p className="text-sm text-muted-foreground">
                  You may need to scroll down in the share menu
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                3
              </div>
              <div>
                <p className="font-medium">Tap "Add" to confirm</p>
                <p className="text-sm text-muted-foreground">
                  The app will appear on your home screen
                </p>
              </div>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={() => setShowIOSModal(false)}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

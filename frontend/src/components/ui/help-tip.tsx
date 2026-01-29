import { useState, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Button } from './button';

interface HelpTipProps {
    id: string;
    title: string;
    description: string;
    showOnce?: boolean;
}

/**
 * Contextual help tip that shows once per user (stored in localStorage)
 * Use this to guide first-time users through the interface
 */
export function HelpTip({ id, title, description, showOnce = true }: HelpTipProps) {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (showOnce) {
            const seen = localStorage.getItem(`helptip_${id}`);
            if (seen === 'true') {
                setDismissed(true);
            } else {
                // Small delay so it appears after page load
                setTimeout(() => setVisible(true), 500);
            }
        } else {
            setVisible(true);
        }
    }, [id, showOnce]);

    const handleDismiss = () => {
        if (showOnce) {
            localStorage.setItem(`helptip_${id}`, 'true');
        }
        setDismissed(true);
    };

    if (dismissed || !visible) {
        return null;
    }

    return (
        <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-primary">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={handleDismiss}
                >
                    <X className="w-3 h-3" />
                </Button>
            </div>
        </div>
    );
}

/**
 * Reset all help tips (useful for testing or if user wants to see them again)
 */
export function resetHelpTips() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('helptip_'));
    keys.forEach(k => localStorage.removeItem(k));
}

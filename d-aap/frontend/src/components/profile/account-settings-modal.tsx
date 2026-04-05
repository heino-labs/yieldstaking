import { useCallback } from 'react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

import { AccountSettingsForm } from './account-settings-form';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MODAL_CLASSES =
    'w-[90vw] !max-w-5xl max-h-[90vh] overflow-hidden m-0 rounded-lg flex flex-col';
const CONTENT_CLASSES = 'overflow-x-hidden overflow-y-hidden flex-1 min-h-0';

export function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
    const handleOpenChange = useCallback(
        (open: boolean) => {
            if (!open) {
                onClose();
            }
        },
        [onClose],
    );

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent 
                className={MODAL_CLASSES}
                onInteractOutside={(e) => {
                    // Prevent closing when clicking on RainbowKit/MetaMask modals
                    const target = e.target as HTMLElement;
                    if (target?.closest('[data-rk]') || target?.closest('.iekbcc0')) {
                        e.preventDefault();
                    }
                }}
            >
                <DialogHeader className="sr-only">
                    <DialogTitle>Account Settings</DialogTitle>
                    <DialogDescription>
                        Update your profile information and manage your linked wallet.
                    </DialogDescription>
                </DialogHeader>
                <div className={CONTENT_CLASSES}>
                    <AccountSettingsForm onCancel={onClose} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

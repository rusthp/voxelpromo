import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { toast } from 'sonner';

interface AvatarUploadProps {
    currentAvatarUrl?: string;
    displayName?: string;
    onAvatarChange: (newUrl: string | undefined) => void;
    size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
};

export function AvatarUpload({
    currentAvatarUrl,
    displayName = 'User',
    onAvatarChange,
    size = 'lg',
}: AvatarUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentAvatarUrl);
    const [imageError, setImageError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync previewUrl when currentAvatarUrl changes from parent
    useEffect(() => {
        setPreviewUrl(currentAvatarUrl);
        setImageError(false); // Reset error when URL changes
    }, [currentAvatarUrl]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WebP.');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Arquivo muito grande. O tamanho máximo é 5MB.');
            return;
        }

        // Preview
        const reader = new FileReader();
        reader.onload = (event) => {
            setPreviewUrl(event.target?.result as string);
            setImageError(false);
        };
        reader.readAsDataURL(file);

        // Upload
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await api.post('/profile/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const newAvatarUrl = response.data.avatarUrl;
            onAvatarChange(newAvatarUrl);
            toast.success('Avatar atualizado com sucesso!');
        } catch (error: any) {
            console.error('Avatar upload error:', error);
            toast.error(error.response?.data?.error || 'Erro ao fazer upload do avatar');
            // Revert preview
            setPreviewUrl(currentAvatarUrl);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        setIsUploading(true);
        try {
            await api.delete('/profile/avatar');
            setPreviewUrl(undefined);
            setImageError(false);
            onAvatarChange(undefined);
            toast.success('Avatar removido com sucesso!');
        } catch (error: any) {
            console.error('Avatar remove error:', error);
            toast.error(error.response?.data?.error || 'Erro ao remover avatar');
        } finally {
            setIsUploading(false);
        }
    };

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const fullAvatarUrl = previewUrl?.startsWith('http') || previewUrl?.startsWith('data:')
        ? previewUrl
        : previewUrl
            ? `${apiBaseUrl}${previewUrl}`
            : undefined;

    // Show image only if URL exists and no loading error
    const showImage = fullAvatarUrl && !imageError;

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div
                    className={cn(
                        'rounded-full overflow-hidden bg-gradient-to-br from-primary to-info flex items-center justify-center',
                        sizeClasses[size]
                    )}
                >
                    {showImage ? (
                        <img
                            src={fullAvatarUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            onError={() => {
                                console.error('Failed to load avatar:', fullAvatarUrl);
                                setImageError(true);
                            }}
                        />
                    ) : (
                        <span className="text-primary-foreground font-bold text-2xl">
                            {getInitials(displayName)}
                        </span>
                    )}
                </div>

                {/* Overlay with camera icon */}
                <div
                    className={cn(
                        'absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer',
                        isUploading && 'opacity-100'
                    )}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                    {isUploading ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                        <Camera className="w-6 h-6 text-white" />
                    )}
                </div>

                {/* Remove button */}
                {previewUrl && !isUploading && (
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full"
                        onClick={handleRemoveAvatar}
                    >
                        <X className="w-3 h-3" />
                    </Button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />

            <p className="text-xs text-muted-foreground text-center">
                Clique para alterar o avatar
                <br />
                JPEG, PNG, GIF ou WebP (máx. 5MB)
            </p>
        </div>
    );
}

import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

// Google icon SVG
const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

interface GoogleLoginButtonProps {
    onSuccess: (idToken: string) => Promise<void>;
    onError?: (error: Error) => void;
    disabled?: boolean;
    text?: string;
}

export function GoogleLoginButton({
    onSuccess,
    onError,
    disabled = false,
    text = "Continuar com Google",
}: GoogleLoginButtonProps) {
    const [loading, setLoading] = useState(false);

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            try {
                // Get ID token from Google using access token
                const response = await fetch(
                    `https://www.googleapis.com/oauth2/v3/userinfo`,
                    {
                        headers: {
                            Authorization: `Bearer ${tokenResponse.access_token}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to get user info from Google");
                }

                // For implicit flow, we use the access token directly
                // The backend will verify this token
                await onSuccess(tokenResponse.access_token);
            } catch (error: any) {
                console.error("Google login error:", error);
                onError?.(error);
            } finally {
                setLoading(false);
            }
        },
        onError: (error) => {
            console.error("Google OAuth error:", error);
            onError?.(new Error(error.error_description || "Erro ao conectar com Google"));
        },
        flow: "implicit",
    });

    const handleClick = () => {
        if (!loading && !disabled) {
            login();
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            className="w-full bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
            onClick={handleClick}
            disabled={loading || disabled}
        >
            {loading ? (
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Conectando...
                </>
            ) : (
                <>
                    <GoogleIcon />
                    {text}
                </>
            )}
        </Button>
    );
}

export default GoogleLoginButton;

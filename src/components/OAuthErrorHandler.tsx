import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * When Supabase redirects with OAuth errors (e.g. bad_oauth_state), show a message and send user to /auth.
 */
export function OAuthErrorHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const errorCode = searchParams.get('error_code');
    const error = searchParams.get('error_description') || searchParams.get('error');

    if (errorCode === 'bad_oauth_state' || (error && error.toLowerCase().includes('oauth'))) {
      toast.error('Sign-in expired or invalid. Please try again.', {
        description: 'Use the same browser tab and allow cookies for this site.',
      });
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('error');
        next.delete('error_code');
        next.delete('error_description');
        return next;
      });
      navigate('/auth', { replace: true });
    }
  }, [searchParams, setSearchParams, navigate]);

  return null;
}

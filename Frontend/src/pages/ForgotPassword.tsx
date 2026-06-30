import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/** Forgot password — enter email, receive a reset link. */
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(clean, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      setSent(true);
    } catch (err) {
      // Backend doesn't reveal whether the email exists — surface only transport errors.
      const msg = err instanceof Error ? err.message : 'Could not send reset link';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-xwide mx-auto w-full">
        <Logo size="md" />
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="font-medium text-foreground">{email}</span>,
                we've sent a link to reset your password. The link expires in 15 minutes.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Return to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Forgot your password?</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we'll send you a link to reset it.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fp-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fp-email"
                      type="email"
                      placeholder="you@email.com"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={loading || !email}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Remembered it?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;

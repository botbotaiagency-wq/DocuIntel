import { useState } from "react";
import { FileSearch, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export default function Landing() {
  const { login, isLoggingIn, loginError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login({ username, password });
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row overflow-hidden">
      <div className="hidden lg:flex flex-1 relative flex-col justify-center p-16 xl:p-24 border-r border-border/50 bg-card/30 z-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-[100px] opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] opacity-50"></div>
        </div>

        <div className="relative z-10 flex flex-col max-w-2xl">
          <div className="flex items-center gap-3 mb-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <FileSearch className="h-6 w-6" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">DocuIntel</span>
          </div>

          <h1 className="text-4xl xl:text-6xl font-display font-bold leading-[1.1] mb-6 tracking-tight">
            Secure Document Intelligence for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Legal & ID Extraction</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-12 max-w-xl leading-relaxed">
            Automate data extraction, run robust compliance checks, and secure PII with zero-retention processing architecture built for enterprise security.
          </p>
        </div>
      </div>

      <div className="flex-1 lg:flex-none lg:w-[450px] xl:w-[500px] flex flex-col justify-center p-6 sm:p-8 lg:p-16 bg-background relative z-20 lg:shadow-2xl min-h-screen lg:min-h-0">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3 lg:hidden mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <FileSearch className="h-6 w-6" />
              </div>
              <span className="font-display text-2xl font-bold tracking-tight text-foreground">DocuIntel</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight" data-testid="text-login-title">Staff Login</h2>
            <p className="text-muted-foreground text-sm sm:text-base">Sign in with your staff credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {(error || loginError) && (
              <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg border border-destructive/20" data-testid="text-login-error">
                {error || loginError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
                className="h-12 text-base"
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="pr-12 h-12 text-base"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit"
              size="lg" 
              className="w-full h-12 sm:h-14 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
              disabled={isLoggingIn}
              data-testid="button-login"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground px-4">
              Contact your administrator if you need access credentials.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

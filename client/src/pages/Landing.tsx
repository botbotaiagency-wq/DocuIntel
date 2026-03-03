import { ShieldCheck, FileSearch, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      {/* Left Panel: Branding & Hero */}
      <div className="flex-1 relative flex flex-col justify-center p-8 md:p-16 lg:p-24 border-r border-border/50 bg-card/30 z-10">
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

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.1] mb-6 tracking-tight">
            Secure Document Intelligence for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Legal & ID Extraction</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-12 max-w-xl leading-relaxed">
            Automate data extraction, run robust compliance checks, and secure PII with zero-retention processing architecture built for enterprise security.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">SOC2 Compliant</h3>
                <p className="text-sm text-muted-foreground">Enterprise-grade security standards</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Zero Retention</h3>
                <p className="text-sm text-muted-foreground">Process-only modes available</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Auth */}
      <div className="w-full md:w-[450px] lg:w-[500px] flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-background relative z-20 shadow-2xl">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-display font-bold tracking-tight">Welcome Back</h2>
            <p className="text-muted-foreground">Authenticate to access your workspace</p>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleLogin} 
              size="lg" 
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              Continue with Replit
            </Button>
            
            <p className="text-xs text-center text-muted-foreground px-4">
              By authenticating, you agree to our Terms of Service and Privacy Policy. Secure SSO provided by Replit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

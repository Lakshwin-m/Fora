import { Link } from "react-router-dom";
import { SunIcon as Sunburst, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col selection:bg-primary/30 selection:text-primary-foreground">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary backdrop-blur-md border border-primary/20">
            <Sunburst className="w-5 h-5" />
          </div>
          <span className="font-heading font-bold text-xl text-foreground tracking-tight">Forá</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors font-medium text-sm">
            Log In
          </Link>
          <Link 
            to="/signup" 
            className="px-5 py-2.5 bg-surface/50 hover:bg-surface backdrop-blur-md border border-border text-foreground rounded-full text-sm font-medium transition-all hover:shadow-glow hover:border-primary/50"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Ambient Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none animate-pulse duration-10000" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/15 rounded-full blur-[150px] pointer-events-none animate-pulse duration-7000 delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[800px] max-h-[800px] bg-[radial-gradient(circle,hsl(var(--primary)/0.05)_0%,transparent_70%)] pointer-events-none" />

      {/* Main Hero Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 relative z-10 mt-16">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-border backdrop-blur-sm mb-8 animate-modal-fade-in shadow-sm">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Obsidian Bloom Edition</span>
        </div>

        {/* Heading */}
        <h1 className="max-w-4xl text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-heading font-extrabold tracking-tighter text-foreground drop-shadow-sm mb-6 animate-modal-slide-from-bottom-right [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]">
          Preserve your <br className="hidden sm:block" />
          <span className="bg-gradient-primary bg-clip-text text-transparent italic pr-2">future memories.</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-12 animate-modal-slide-from-bottom-right [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards] leading-relaxed">
          Create beautiful digital time capsules for the moments that matter most. 
          Share them instantly or lock them away for a future reveal.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 items-center animate-modal-slide-from-bottom-right [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]">
          <Link 
            to="/signup" 
            className="group px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold text-lg transition-all hover:opacity-90 shadow-glow flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            Start Creating 
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            to="/login" 
            className="px-8 py-4 bg-surface hover:bg-elevated border border-border text-foreground rounded-full font-semibold text-lg transition-all w-full sm:w-auto justify-center flex hover:shadow-soft"
          >
            Sign In
          </Link>
        </div>

        {/* Optional Glassmorphic Visual Element */}
        <div className="mt-20 w-full max-w-4xl h-64 md:h-96 rounded-[2rem] border border-border/50 bg-surface/30 backdrop-blur-2xl shadow-card relative overflow-hidden animate-modal-slide-from-bottom-right [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards] group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-32 h-32 md:w-48 md:h-48">
              <div className="absolute inset-0 border border-primary/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
              <div className="absolute inset-2 border border-secondary/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sunburst className="w-12 h-12 md:w-16 md:h-16 text-primary drop-shadow-[0_0_15px_rgba(251,99,118,0.5)] animate-pulse" />
              </div>
            </div>
          </div>

          {/* Decorative glass panels */}
          <div className="absolute -left-10 top-10 w-32 h-32 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl rotate-12 group-hover:rotate-6 transition-transform duration-700"></div>
          <div className="absolute -right-10 bottom-10 w-48 h-48 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl -rotate-12 group-hover:-rotate-6 transition-transform duration-700"></div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-muted-foreground text-sm border-t border-border mt-auto backdrop-blur-md bg-background/50 flex flex-col items-center gap-2">
        <p>© {new Date().getFullYear()} Forá Time Capsules. All rights reserved.</p>
        <p className="text-xs font-medium opacity-80">
          A Product by <span style={{ fontFamily: '"JetBrains Mono", monospace' }} className="text-foreground font-semibold tracking-tight">./localhost</span>
        </p>
      </footer>
    </div>
  );
};

export default Index;

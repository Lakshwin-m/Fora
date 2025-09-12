import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Mail, Lock, Github } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate authentication
    setTimeout(() => {
      toast({
        title: isLogin ? "Welcome back!" : "Account created!",
        description: isLogin ? "You've successfully signed in." : "Your account has been created successfully.",
      });
      navigate('/dashboard');
      setIsLoading(false);
    }, 1500);
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: `${provider} login`,
      description: `Redirecting to ${provider} authentication...`,
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero opacity-10" />
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Forá
            </span>
          </div>
          <p className="text-muted-foreground">
            {isLogin ? 'Welcome back to your time capsule' : 'Create your time capsule journey'}
          </p>
        </div>

        <Card className="border-border shadow-card bg-card/80 backdrop-blur-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isLogin ? 'Sign In' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Enter your credentials to access your capsules' 
                : 'Join Forá and start creating time capsules'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Social Login */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full border-border hover:bg-muted/20"
                onClick={() => handleSocialLogin('Google')}
              >
                <Mail className="w-4 h-4 mr-2" />
                Continue with Google
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-border hover:bg-muted/20"
                onClick={() => handleSocialLogin('GitHub')}
              >
                <Github className="w-4 h-4 mr-2" />
                Continue with GitHub
              </Button>
            </div>

            <div className="relative">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-card px-3 text-sm text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border bg-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-border bg-input"
                />
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="border-border bg-input"
                  />
                </div>
              )}

              {isLogin && (
                <div className="text-right">
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary hover:text-primary-glow transition-smooth"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover-glow shadow-glow" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                  </div>
                ) : (
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                )}
              </Button>
            </form>

            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:text-primary-glow transition-smooth font-medium"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
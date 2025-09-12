// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-6">
          <div className="w-8 h-8 text-white">⏰</div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Welcome to Forá
        </h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Your time capsule messaging platform. Create memories for the future.
        </p>
        <div className="pt-4">
          <a 
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-gradient-primary text-white rounded-lg hover:shadow-glow transition-smooth"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
};

export default Index;

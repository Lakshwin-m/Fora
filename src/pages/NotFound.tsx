import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "@/contexts/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-6">
          <div className="w-8 h-8 text-white">❌</div>
        </div>
        <h1 className="mb-4 text-4xl font-bold text-foreground">{t('notFound.title')}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('notFound.subtitle')}</p>
        <a 
          href="/dashboard" 
          className="inline-flex items-center text-primary hover:text-primary-glow transition-smooth underline"
        >
          {t('notFound.returnBtn')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;

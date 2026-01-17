import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold gradient-text">{t('notFound.title')}</h1>
        <p className="mb-2 text-2xl font-semibold">{t('notFound.subtitle')}</p>
        <p className="mb-8 text-muted-foreground">{t('notFound.description')}</p>
        <Link to="/">
          <Button className="gradient-primary text-white">{t('notFound.backHome')}</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

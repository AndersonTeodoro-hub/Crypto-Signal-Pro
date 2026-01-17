import { Button } from '@/components/ui/button';
import { TrendingUp, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg gradient-primary">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">Crypto Signal Pro</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => scrollToSection('como-funciona')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Como Funciona
            </button>
            <button 
              onClick={() => scrollToSection('recursos')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Recursos
            </button>
            <button 
              onClick={() => scrollToSection('precos')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Preços
            </button>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button className="gradient-primary text-white">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth/login">
                  <Button variant="ghost">Entrar</Button>
                </Link>
                <Link to="/auth/register">
                  <Button className="gradient-primary text-white">Começar Grátis</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <nav className="flex flex-col gap-4">
              <button 
                onClick={() => scrollToSection('como-funciona')}
                className="text-left text-muted-foreground hover:text-foreground transition-colors"
              >
                Como Funciona
              </button>
              <button 
                onClick={() => scrollToSection('recursos')}
                className="text-left text-muted-foreground hover:text-foreground transition-colors"
              >
                Recursos
              </button>
              <button 
                onClick={() => scrollToSection('precos')}
                className="text-left text-muted-foreground hover:text-foreground transition-colors"
              >
                Preços
              </button>
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                {user ? (
                  <Link to="/dashboard">
                    <Button className="w-full gradient-primary text-white">Dashboard</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth/login">
                      <Button variant="ghost" className="w-full">Entrar</Button>
                    </Link>
                    <Link to="/auth/register">
                      <Button className="w-full gradient-primary text-white">Começar Grátis</Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

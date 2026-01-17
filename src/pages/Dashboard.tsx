import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, LogOut, Settings, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border p-4 hidden md:block">
        <div className="flex items-center gap-2 mb-8">
          <div className="p-1.5 rounded-lg gradient-primary">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold gradient-text">CSP</span>
        </div>
        
        <nav className="space-y-2">
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
            <BarChart3 className="h-5 w-5" />
            Dashboard
          </Link>
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <Settings className="h-5 w-5" />
            Configurações
          </Link>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-5 w-5 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Bem-vindo de volta!</h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Seus Sinais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum sinal disponível ainda.</p>
              <p className="text-sm text-muted-foreground">Configure um par para começar a receber sinais.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

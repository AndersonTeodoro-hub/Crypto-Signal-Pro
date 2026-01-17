import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, LogOut, Settings, BarChart3, History, Menu, Play, Clock, CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface GenerationResult {
  timeframe: string;
  timestamp: Date;
  success: boolean;
  processed: number;
  signalsCreated: number;
  results: Array<{
    pair: string;
    signal?: unknown;
    error?: string;
  }>;
  error?: string;
}

export default function Admin() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [generating1H, setGenerating1H] = useState(false);
  const [generating4H, setGenerating4H] = useState(false);
  const [history, setHistory] = useState<GenerationResult[]>([]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const generateSignals = async (timeframe: '1H' | '4H') => {
    const setLoading = timeframe === '1H' ? setGenerating1H : setGenerating4H;
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Sessão expirada. Faça login novamente.',
        });
        return;
      }

      const response = await supabase.functions.invoke('admin-generate-signals', {
        body: { timeframe }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      setHistory(prev => [{
        timeframe,
        timestamp: new Date(),
        success: true,
        processed: result.processed,
        signalsCreated: result.signalsCreated,
        results: result.results
      }, ...prev.slice(0, 9)]);

      toast({
        title: '✅ Geração Concluída',
        description: `${result.signalsCreated} sinais criados de ${result.processed} pares analisados.`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setHistory(prev => [{
        timeframe,
        timestamp: new Date(),
        success: false,
        processed: 0,
        signalsCreated: 0,
        results: [],
        error: errorMessage
      }, ...prev.slice(0, 9)]);

      toast({
        variant: 'destructive',
        title: 'Erro na Geração',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2 mb-8">
        <div className="p-1.5 rounded-lg gradient-primary">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold gradient-text">CSP</span>
      </div>
      
      <nav className="space-y-2">
        <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <BarChart3 className="h-5 w-5" />
          Dashboard
        </Link>
        <Link to="/history" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <History className="h-5 w-5" />
          Histórico
        </Link>
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Settings className="h-5 w-5" />
          Configurações
        </Link>
        <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
          <Shield className="h-5 w-5" />
          Admin
        </Link>
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
          <LogOut className="h-5 w-5 mr-2" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border p-4 hidden md:block">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-lg border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg gradient-primary">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold gradient-text">CSP</span>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar p-4">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 p-6 pt-20 md:pt-6">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Painel Admin</h1>
          </div>
          <p className="text-muted-foreground">Gere sinais manualmente para teste</p>
        </div>

        {/* Generation Buttons */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeframe 1H
              </CardTitle>
              <CardDescription>
                Gerar sinais para o timeframe de 1 hora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => generateSignals('1H')} 
                disabled={generating1H || generating4H}
                className="w-full"
              >
                {generating1H ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Gerar Agora (1H)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeframe 4H
              </CardTitle>
              <CardDescription>
                Gerar sinais para o timeframe de 4 horas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => generateSignals('4H')} 
                disabled={generating1H || generating4H}
                className="w-full"
              >
                {generating4H ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Gerar Agora (4H)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Histórico de Execuções</CardTitle>
            <CardDescription>
              Últimas 10 execuções do gerador de sinais
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma execução ainda. Clique em um dos botões acima.
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {history.map((item, index) => (
                    <Card key={index} className={`border ${item.success ? 'border-success/50' : 'border-destructive/50'}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {item.success ? (
                              <CheckCircle className="h-5 w-5 text-success" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )}
                            <Badge variant={item.timeframe === '1H' ? 'default' : 'secondary'}>
                              {item.timeframe}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {item.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          {item.success && (
                            <Badge variant="outline">
                              {item.signalsCreated}/{item.processed} sinais
                            </Badge>
                          )}
                        </div>
                        
                        {item.error && (
                          <p className="text-sm text-destructive mb-3">{item.error}</p>
                        )}

                        {item.success && item.results.length > 0 && (
                          <div className="space-y-1">
                            {item.results.slice(0, 5).map((result, idx) => (
                              <div key={idx} className="text-sm flex items-center gap-2">
                                {result.signal ? (
                                  <CheckCircle className="h-3 w-3 text-success" />
                                ) : (
                                  <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                                )}
                                <span className="font-mono">{result.pair}</span>
                                {result.error && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    ({result.error})
                                  </span>
                                )}
                              </div>
                            ))}
                            {item.results.length > 5 && (
                              <p className="text-xs text-muted-foreground">
                                ... e mais {item.results.length - 5} pares
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
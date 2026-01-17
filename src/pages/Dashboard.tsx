import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, LogOut, Settings, BarChart3, History, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PairSelector } from '@/components/signals/PairSelector';
import { SignalCard } from '@/components/signals/SignalCard';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { SignalWithPair, UserSettings } from '@/types/database';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<string>('1H');
  const [signals, setSignals] = useState<SignalWithPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Load user settings
  useEffect(() => {
    async function loadSettings() {
      if (!user) return;

      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setSelectedPair(data.selected_pair_id);
        setTimeframe(data.timeframe);
      }
      setLoading(false);
    }

    loadSettings();
  }, [user]);

  // Save settings when changed
  useEffect(() => {
    async function saveSettings() {
      if (!user || loading) return;

      setSavingSettings(true);
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          selected_pair_id: selectedPair,
          timeframe: timeframe,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      setSavingSettings(false);
    }

    if (selectedPair !== null || timeframe) {
      saveSettings();
    }
  }, [selectedPair, timeframe, user, loading]);

  // Fetch signals
  useEffect(() => {
    async function fetchSignals() {
      if (!selectedPair) {
        setSignals([]);
        return;
      }

      const { data, error } = await supabase
        .from('signals')
        .select(`
          *,
          allowed_pairs (*)
        `)
        .eq('pair_id', selectedPair)
        .eq('timeframe', timeframe)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setSignals(data as SignalWithPair[]);
      }
    }

    fetchSignals();
  }, [selectedPair, timeframe]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedPair) return;

    const channel = supabase
      .channel('signals-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals',
          filter: `pair_id=eq.${selectedPair}`,
        },
        async (payload) => {
          // Fetch the new signal with pair data
          const { data } = await supabase
            .from('signals')
            .select(`*, allowed_pairs (*)`)
            .eq('id', payload.new.id)
            .single();

          if (data && data.timeframe === timeframe) {
            setSignals((prev) => [data as SignalWithPair, ...prev]);
            toast({
              title: '🚀 Novo Sinal!',
              description: `${(data as SignalWithPair).allowed_pairs?.symbol} - ${data.direction === 'LONG' ? 'COMPRA' : 'VENDA'}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPair, timeframe, toast]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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
        <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
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
          <h1 className="text-2xl font-bold">Bem-vindo de volta!</h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        {/* Configuration Card */}
        <Card className="glass border-border/50 mb-6">
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Par de Criptomoeda
                </label>
                <PairSelector value={selectedPair} onValueChange={setSelectedPair} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Timeframe
                </label>
                <Tabs value={timeframe} onValueChange={setTimeframe}>
                  <TabsList className="w-full">
                    <TabsTrigger value="1H" className="flex-1">1H</TabsTrigger>
                    <TabsTrigger value="4H" className="flex-1">4H</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signals List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Seus Sinais</h2>
          
          {!selectedPair ? (
            <Card className="glass border-border/50">
              <CardContent className="py-12">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Selecione um par para ver os sinais.</p>
                </div>
              </CardContent>
            </Card>
          ) : signals.length === 0 ? (
            <Card className="glass border-border/50">
              <CardContent className="py-12">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum sinal disponível para este par.</p>
                  <p className="text-sm text-muted-foreground">Novos sinais aparecerão aqui em tempo real.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

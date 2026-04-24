import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AllowedPair } from '@/types/database';

interface PairSelectorProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
}

export function PairSelector({ value, onValueChange }: PairSelectorProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pairs, setPairs] = useState<AllowedPair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPairs() {
      const { data, error } = await supabase
        .from('allowed_pairs')
        .select('*')
        .eq('is_active', true)
        .order('rank');

      if (!error && data) {
        setPairs(data);
      }
      setLoading(false);
    }

    fetchPairs();
  }, []);

  const selectedPair = pairs.find((pair) => pair.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-background/50"
        >
          {loading ? (
            <span className="text-muted-foreground">Loading...</span>
          ) : selectedPair ? (
            <span className="flex items-center gap-2">
              <span className="font-semibold">{selectedPair.symbol}</span>
              <span className="text-muted-foreground text-sm">({selectedPair.name})</span>
            </span>
          ) : (
            <span className="font-semibold">{t('dashboard.allPairs')}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search pair..." />
          <CommandList>
            <CommandEmpty>No pair found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                key="__all__"
                value={t('dashboard.allPairs')}
                onSelect={() => {
                  onValueChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === null ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="font-semibold">{t('dashboard.allPairs')}</span>
              </CommandItem>
              {pairs.map((pair) => (
                <CommandItem
                  key={pair.id}
                  value={`${pair.symbol} ${pair.name}`}
                  onSelect={() => {
                    onValueChange(pair.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === pair.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="font-semibold">{pair.symbol}</span>
                  <span className="ml-2 text-muted-foreground text-sm">
                    {pair.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActivePairsFiltersProps {
  showOnlyOpen: boolean;
  onShowOnlyOpenChange: (value: boolean) => void;
  timeframeFilter: 'all' | '15m' | '1H';
  onTimeframeFilterChange: (value: 'all' | '15m' | '1H') => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  resultCount: number;
  plan: 'free' | 'basic' | 'pro';
}

export function ActivePairsFilters({
  showOnlyOpen,
  onShowOnlyOpenChange,
  timeframeFilter,
  onTimeframeFilterChange,
  searchQuery,
  onSearchQueryChange,
  resultCount,
  plan
}: ActivePairsFiltersProps) {
  const { t } = useLanguage();

  const handleTimeframeChange = (value: string) => {
    if (value && (value === 'all' || value === '15m' || value === '1H')) {
      onTimeframeFilterChange(value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{t('activePairs.title')}</h1>
            <Badge variant="outline" className="capitalize text-xs">
              {plan}
            </Badge>
          </div>
          <p className="text-muted-foreground">{t('activePairs.subtitle')}</p>
        </div>
        
        <Badge variant="secondary" className="self-start md:self-center">
          {resultCount} {resultCount === 1 ? 'par' : 'pares'}
        </Badge>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
        {/* Toggle OPEN */}
        <div className="flex items-center gap-2">
          <Switch 
            id="show-only-open"
            checked={showOnlyOpen} 
            onCheckedChange={onShowOnlyOpenChange}
          />
          <Label htmlFor="show-only-open" className="text-sm font-medium cursor-pointer">
            {t('activePairs.showOnlyOpen')}
          </Label>
        </div>

        {/* Timeframe Chips */}
        <div className="flex-1 flex justify-center">
          <ToggleGroup 
            type="single" 
            value={timeframeFilter} 
            onValueChange={handleTimeframeChange}
            className="bg-background/50 p-1 rounded-lg border border-border/50"
          >
            <ToggleGroupItem 
              value="all" 
              className="px-4 py-1.5 text-sm rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {t('activePairs.allTimeframes')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="15m"
              className="px-4 py-1.5 text-sm rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              15m
            </ToggleGroupItem>
            <ToggleGroupItem
              value="1H"
              className="px-4 py-1.5 text-sm rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              1H
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('activePairs.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-9 h-9 bg-background/50 border-border/50"
          />
        </div>
      </div>
    </div>
  );
}

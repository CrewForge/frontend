import React from 'react';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Settings, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export interface ModelConfig {
  model: string;
  tokenLimit: number;
  contextWindow: number;
  temperature: number;
  topP: number;
}

interface ModelConfigurationProps {
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
}

export function ModelConfiguration({ config, onChange }: ModelConfigurationProps) {
  const handleChange = (key: keyof ModelConfig, value: string | number) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-primary" />
        <h3>Model Configuration</h3>
        <Badge variant="secondary" className="ml-auto text-xs">
          Advanced
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Model Selection */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label>LLM Model</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Select the base LLM to power your agents. Models run locally via Ollama.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select value={config.model} onValueChange={(v) => handleChange('model', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="llama3.1:8b">Llama 3.1 (8B)</SelectItem>
              <SelectItem value="llama3.1:70b">Llama 3.1 (70B)</SelectItem>
              <SelectItem value="mistral:7b">Mistral (7B)</SelectItem>
              <SelectItem value="mixtral:8x7b">Mixtral (8x7B)</SelectItem>
              <SelectItem value="gemma:7b">Gemma (7B)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Currently using: {config.model}
          </p>
        </div>

        {/* Token Limit */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label>Token Limit</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Maximum number of tokens the model can generate per response.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.tokenLimit]}
              onValueChange={(v) => handleChange('tokenLimit', v[0])}
              min={256}
              max={4096}
              step={256}
              className="flex-1"
            />
            <Input
              type="number"
              value={config.tokenLimit}
              onChange={(e) => handleChange('tokenLimit', parseInt(e.target.value))}
              className="w-24"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Current: {config.tokenLimit.toLocaleString()} tokens
          </p>
        </div>

        {/* Context Window */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label>Context Window Size</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Number of previous tokens the model can reference when generating responses.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.contextWindow]}
              onValueChange={(v) => handleChange('contextWindow', v[0])}
              min={2048}
              max={32768}
              step={2048}
              className="flex-1"
            />
            <Input
              type="number"
              value={config.contextWindow}
              onChange={(e) => handleChange('contextWindow', parseInt(e.target.value))}
              className="w-24"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Current: {config.contextWindow.toLocaleString()} tokens
          </p>
        </div>

        {/* Temperature */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label>Temperature</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Controls randomness. Lower = more focused, Higher = more creative.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.temperature * 100]}
              onValueChange={(v) => handleChange('temperature', v[0] / 100)}
              min={0}
              max={200}
              step={10}
              className="flex-1"
            />
            <Input
              type="number"
              value={config.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              step={0.1}
              className="w-24"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Current: {config.temperature.toFixed(2)}
          </p>
        </div>

        {/* Top P */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label>Top P (Nucleus Sampling)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Limits token selection to top probability mass. Lower = more focused.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.topP * 100]}
              onValueChange={(v) => handleChange('topP', v[0] / 100)}
              min={10}
              max={100}
              step={5}
              className="flex-1"
            />
            <Input
              type="number"
              value={config.topP}
              onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
              step={0.05}
              className="w-24"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Current: {config.topP.toFixed(2)}
          </p>
        </div>

        {/* GPU Settings */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label>GPU Acceleration</Label>
              <p className="text-xs text-muted-foreground mt-1">
                CUDA detected • 16GB VRAM available
              </p>
            </div>
            <Badge variant="default" className="bg-[var(--success)]">
              Enabled
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}

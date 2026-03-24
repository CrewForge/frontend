import React from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

export interface SandboxPlaybackControlsProps {
  /** When true, live stream mode — prev/next/speed often disabled. */
  isLive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  /** Playback speed multiplier (sample replay only). */
  speed: number;
  onSpeedChange: (speed: number) => void;
  /** e.g. "Move 3 / 42" or "Step 2 / 10" */
  positionLabel: string;
  /** Disable all controls (loading). */
  disabled?: boolean;
  /** Hide prev/next/speed (e.g. live chess with no buffer). */
  hideStepControls?: boolean;
  /** Optional scrubber — discrete index (replay cursor / step). */
  seekMin?: number;
  seekMax?: number;
  seekValue?: number;
  onSeekChange?: (value: number) => void;
  seekLabel?: string;
}

export function SandboxPlaybackControls({
  isLive,
  isPlaying,
  onPlay,
  onPause,
  onRestart,
  onPrev,
  onNext,
  canPrev,
  canNext,
  speed,
  onSpeedChange,
  positionLabel,
  disabled = false,
  hideStepControls = false,
  seekMin = 0,
  seekMax = 0,
  seekValue = 0,
  onSeekChange,
  seekLabel = 'Position',
}: SandboxPlaybackControlsProps) {
  const stepDisabled = isLive && hideStepControls;
  const seekUsable =
    !stepDisabled && typeof onSeekChange === 'function' && seekMax > seekMin;

  return (
    <div className="sandbox-playback-bar">
      <div className="sandbox-playback-bar__main">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="min-w-[7rem] font-medium"
          disabled={disabled}
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Play
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-md"
          disabled={disabled || stepDisabled || !canPrev}
          onClick={onPrev}
          aria-label="Previous"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-md"
          disabled={disabled || stepDisabled || !canNext}
          onClick={onNext}
          aria-label="Next"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-md"
          disabled={disabled}
          onClick={onRestart}
          aria-label="Restart"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="sandbox-playback-bar__meta">
        <span className="sandbox-playback-bar__position">{positionLabel}</span>
        {!stepDisabled && (
          <label className="sandbox-playback-bar__speed sandbox-playback-bar__speed--compact">
            <span className="sandbox-playback-bar__speed-label">Speed</span>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.25}
              value={speed}
              disabled={disabled || isLive}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              aria-label="Playback speed"
            />
            <span className="sandbox-playback-bar__speed-value">{speed.toFixed(2)}×</span>
          </label>
        )}
      </div>

      {seekUsable && (
        <label className="sandbox-playback-bar__seek">
          <span className="sandbox-playback-bar__seek-label">{seekLabel}</span>
          <input
            type="range"
            min={seekMin}
            max={seekMax}
            step={1}
            value={Math.min(seekMax, Math.max(seekMin, seekValue))}
            disabled={disabled}
            onChange={(e) => onSeekChange?.(Number(e.target.value))}
            aria-label={`${seekLabel} scrub`}
          />
        </label>
      )}
    </div>
  );
}

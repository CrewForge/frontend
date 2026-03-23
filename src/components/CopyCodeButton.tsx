import React, { useCallback, useEffect, useRef, useState } from 'react';

type CopyCodeButtonProps = {
  textToCopy: string;
  disabled?: boolean;
};

export function CopyCodeButton({ textToCopy, disabled = false }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (disabled || !textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.setAttribute('aria-hidden', 'true');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        return;
      }
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, 2000);
  }, [disabled, textToCopy]);

  const isDisabled = disabled || !textToCopy.trim();

  return (
    <button
      type="button"
      className={`evalplus-copy-btn ${copied ? 'evalplus-copy-btn--copied' : ''}`}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
    >
      {copied ? 'COPIED' : 'COPY'}
    </button>
  );
}

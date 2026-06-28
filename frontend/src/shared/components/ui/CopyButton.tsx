import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonProps } from './Button';

interface CopyButtonProps extends Omit<ButtonProps, 'onClick'> {
  value: string;
}

export function CopyButton({ value, children, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="surface"
      size="sm"
      onClick={handleCopy}
      leftIcon={copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {...props}
    >
      {copied ? 'Copied' : children ?? 'Copy'}
    </Button>
  );
}

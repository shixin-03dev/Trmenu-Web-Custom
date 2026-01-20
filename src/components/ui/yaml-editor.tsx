import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import yaml from 'js-yaml';
import { dumpYaml } from '@/lib/yaml-utils';

interface YamlEditorProps {
  value: any;
  onChange: (val: any) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export const YamlEditor = ({ value, onChange, label, placeholder, className, readOnly }: YamlEditorProps) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize text from value
  useEffect(() => {
    try {
      const currentParsed = text ? yaml.load(text) : undefined;
      // Deep compare roughly
      if (JSON.stringify(currentParsed) !== JSON.stringify(value)) {
          setText(dumpYaml(value));
      }
    } catch (e) {
      // If current text is invalid, force update from value
      setText(dumpYaml(value));
    }
  }, [value]);

  const handleBlur = () => {
    if (readOnly) return;
    try {
      const parsed = yaml.load(text);
      onChange(parsed);
      setError(null);
    } catch (err) {
      setError('YAML Format Error: ' + (err as Error).message);
    }
  };

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <Textarea 
        value={text} 
        onChange={(e) => {
            setText(e.target.value);
            setError(null); // Clear error on edit
        }} 
        onBlur={handleBlur}
        className={cn("font-mono text-xs flex-1 resize-none", error && "border-red-500 focus-visible:ring-red-500")} 
        placeholder={placeholder}
        readOnly={readOnly}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

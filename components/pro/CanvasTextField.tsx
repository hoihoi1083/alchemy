"use client";

import {
  forwardRef,
  useEffect,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/**
 * Local draft buffer so React Flow's async node `setNodes` does not jump the caret
 * to the end of the field on every keystroke (xyflow#2221).
 */
function useCanvasFieldDraft(
  value: string | undefined,
  onChange: (value: string) => void,
) {
  const external = value ?? "";
  const [draft, setDraft] = useState(external);

  useEffect(() => {
    setDraft(external);
  }, [external]);

  const handleChange = (next: string) => {
    setDraft(next);
    onChange(next);
  };

  return [draft, handleChange] as const;
}

const FIELD_CLASS = "nodrag nopan nowheel";

type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange"
> & {
  value: string | undefined;
  onChange: (value: string) => void;
};

export const CanvasTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function CanvasTextarea({ value, onChange, className = "", ...rest }, ref) {
    const [draft, setDraft] = useCanvasFieldDraft(value, onChange);
    return (
      <textarea
        {...rest}
        ref={ref}
        value={draft}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
        className={`${FIELD_CLASS} ${className}`.trim()}
      />
    );
  },
);

type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  value: string | undefined;
  onChange: (value: string) => void;
};

export const CanvasInput = forwardRef<HTMLInputElement, InputProps>(
  function CanvasInput({ value, onChange, className = "", ...rest }, ref) {
    const [draft, setDraft] = useCanvasFieldDraft(value, onChange);
    return (
      <input
        {...rest}
        ref={ref}
        value={draft}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
        className={`${FIELD_CLASS} ${className}`.trim()}
      />
    );
  },
);

"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

type RevealProps = {
  children: ReactNode;
  /** Extra delay before this block starts (ms). */
  delayMs?: number;
  /** Upward travel distance in px. */
  distance?: number;
  /** Starting scale (1 = none). */
  scaleFrom?: number;
  className?: string;
  /** Once visible, stay revealed (default true). */
  once?: boolean;
};

/**
 * Scroll-triggered fade / rise / scale-in.
 * Dramatic by default; respects prefers-reduced-motion.
 */
export function Reveal({
  children,
  delayMs = 0,
  distance = 56,
  scaleFrom = 0.92,
  className = "",
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          if (once) io.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      // Fire a bit before fully in view so the rise feels intentional
      { threshold: 0.08, rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, reduceMotion]);

  const style: CSSProperties = reduceMotion
    ? undefined
    : {
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translate3d(0,0,0) scale(1)"
          : `translate3d(0,${distance}px,0) scale(${scaleFrom})`,
        filter: visible ? "blur(0px)" : "blur(6px)",
        transition: [
          `opacity 0.85s cubic-bezier(0.16,1,0.3,1) ${delayMs}ms`,
          `transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delayMs}ms`,
          `filter 0.75s cubic-bezier(0.16,1,0.3,1) ${delayMs}ms`,
        ].join(", "),
        willChange: visible ? undefined : "opacity, transform, filter",
      };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

type RevealStaggerProps = {
  children: ReactNode;
  /** Delay between each child (ms). */
  stepMs?: number;
  distance?: number;
  scaleFrom?: number;
  className?: string;
};

/**
 * Stagger reveal for card grids — each direct child enters slightly later.
 */
export function RevealStagger({
  children,
  stepMs = 100,
  distance = 48,
  scaleFrom = 0.94,
  className = "",
}: RevealStaggerProps) {
  return (
    <div className={className}>
      {Children.map(children, (child, i) => {
        if (!isValidElement(child)) {
          return (
            <Reveal delayMs={i * stepMs} distance={distance} scaleFrom={scaleFrom}>
              {child}
            </Reveal>
          );
        }
        return (
          <Reveal
            key={child.key ?? i}
            delayMs={i * stepMs}
            distance={distance}
            scaleFrom={scaleFrom}
          >
            {cloneElement(child as ReactElement)}
          </Reveal>
        );
      })}
    </div>
  );
}

'use client';

import { useRef, useEffect, useState, type PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface AnimatedTitleProps {
  containerClass?: string;
}

export function AnimatedTitle({
  children,
  containerClass,
}: PropsWithChildren<AnimatedTitleProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={cn("animated-title", containerClass)}>
      {children
        ?.toString()
        .split("<br />")
        .map((line) => (
          <h1
            key={line}
            className="flex-center max-w-full flex-wrap gap-2 px-10 md:gap-3"
          >
            {line.split(" ").map((word) => (
              <span
                key={`${line}-${word}`}
                className={cn("animated-word", visible && "animated-word-visible")}
                dangerouslySetInnerHTML={{ __html: word }}
              />
            ))}
          </h1>
        ))}
    </div>
  );
}

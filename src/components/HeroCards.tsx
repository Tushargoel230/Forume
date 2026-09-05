"use client";

import { useEffect, useRef } from "react";
import { ResumeMini } from "@/components/ResumeMini";

/** The hero's layered résumé composition — same cards, stamp, and drift as
    before, now brought to life: the ATS stamp thumps down and the crop marks
    develop on load, and the whole stack tilts in 3D toward the cursor. All of
    it stands down for reduced-motion / touch devices. */
export function HeroCards() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    const stack = stackRef.current;
    if (!zone || !stack) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      stack.style.transform = `rotateY(${cx * 7}deg) rotateX(${-cy * 7}deg)`;
      if (Math.abs(tx - cx) > 0.0008 || Math.abs(ty - cy) > 0.0008) frame = requestAnimationFrame(loop);
      else frame = 0;
    };
    const onMove = (e: PointerEvent) => {
      const r = zone.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      tx = 0; ty = 0;
      if (!frame) frame = requestAnimationFrame(loop);
    };
    zone.addEventListener("pointermove", onMove);
    zone.addEventListener("pointerleave", onLeave);
    return () => {
      zone.removeEventListener("pointermove", onMove);
      zone.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={zoneRef}
      className="rise relative mx-auto h-[420px] w-full max-w-[400px]"
      style={{ "--rise-delay": "0.4s", perspective: "1100px" } as React.CSSProperties}
    >
      <div
        ref={stackRef}
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d", transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)" }}
      >
        <div
          className="drift absolute left-0 top-10 w-[76%]"
          style={{ "--tilt": "-5deg", "--drift-delay": "0.8s" } as React.CSSProperties}
        >
          <ResumeMini variant="modern" className="opacity-80" />
        </div>
        <div
          className="drift cropmarks proof-crops absolute right-0 top-0 w-[80%]"
          style={{ "--tilt": "2.5deg" } as React.CSSProperties}
        >
          <ResumeMini variant="slate" />
        </div>
        <span className="stamp stamp-thump absolute -bottom-1 right-6 bg-coal/80 text-2xl text-gold-soft backdrop-blur-sm">
          ATS 100
          <span className="block text-[0.5rem] tracking-[0.24em]">passes screening</span>
        </span>
      </div>
    </div>
  );
}

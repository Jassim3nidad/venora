"use client";

import { useEffect, useState } from "react";
import { popUpEvent } from "../data/mock-store";
import { MapPin } from "lucide-react";

export default function PopUpCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const target = new Date(popUpEvent.date).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="w-full bg-border py-16">
      <div className="mx-auto flex max-w-5xl flex-col items-center text-center px-4">
        <h3 className="font-display text-2xl font-black uppercase tracking-widest text-text-primary mb-2">
          {popUpEvent.name}
        </h3>
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-text-secondary mb-6">
          <MapPin className="h-4 w-4" /> {popUpEvent.location}
        </p>
        
        <div className="flex gap-4 sm:gap-8 mb-8">
          {[
            { label: "Days", value: timeLeft.days },
            { label: "Hours", value: timeLeft.hours },
            { label: "Mins", value: timeLeft.minutes },
            { label: "Secs", value: timeLeft.seconds },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center">
              <span className="font-display text-4xl font-black text-brand-500 sm:text-6xl">
                {String(item.value).padStart(2, "0")}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-text-secondary mt-1">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        
        <p className="max-w-xl text-text-secondary">
          {popUpEvent.description}
        </p>
      </div>
    </section>
  );
}

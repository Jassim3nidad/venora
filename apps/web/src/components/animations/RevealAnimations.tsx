"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const customEasing: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface RevealGroupProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
  delayChildren?: number;
}

export function RevealGroup({
  children,
  staggerDelay = 0.08,
  className = "",
  delayChildren = 0,
}: RevealGroupProps) {
  const prefersReducedMotion = useReducedMotion();

  const variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
        delayChildren,
      },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

interface RevealItemProps {
  children: ReactNode;
  yOffset?: number;
  duration?: number;
  className?: string;
}

export function RevealItem({
  children,
  yOffset = 12,
  duration = 0.45,
  className = "",
}: RevealItemProps) {
  const prefersReducedMotion = useReducedMotion();

  const variants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : yOffset,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.01 : duration,
        ease: customEasing,
      },
    },
  };

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

interface ScrollRevealProps {
  children: ReactNode;
  yOffset?: number;
  duration?: number;
  className?: string;
}

export function ScrollReveal({
  children,
  yOffset = 16,
  duration = 0.45,
  className = "",
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  const variants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : yOffset,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.01 : duration,
        ease: customEasing,
      },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

export function ScrollRevealGroup({
  children,
  staggerDelay = 0.08,
  className = "",
}: RevealGroupProps) {
  const prefersReducedMotion = useReducedMotion();

  const variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
      },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

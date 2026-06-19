"use client";

import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Hero() {
  return (
    <section className="flex min-h-[100dvh] items-center">
      <motion.div
        className="w-full max-w-2xl"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.p
          variants={item}
          className="mb-4 font-mono text-sm text-muted tracking-widest uppercase"
        >
          Aguwa Chinedu — Civil &amp; Structural Engineer
        </motion.p>

        <motion.h1
          variants={item}
          className="text-5xl font-semibold leading-[1.05] tracking-tighter md:text-6xl"
        >
          Structures that stand,<br />from soil to skyline.
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-xl text-lg leading-relaxed text-muted"
        >
          I design reinforced concrete and steel structures, conduct
          experimental concrete research, and assess the structural integrity
          of existing buildings.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <motion.a
            href="#projects"
            className="rounded-xl bg-accent px-6 py-3 font-medium text-black"
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            View projects
          </motion.a>
          <motion.a
            href="#contact"
            className="text-muted underline-offset-4 text-sm"
            whileHover={{ color: "var(--color-foreground)", textDecoration: "underline" }}
            transition={{ duration: 0.15 }}
          >
            Get in touch
          </motion.a>
        </motion.div>
      </motion.div>
    </section>
  );
}

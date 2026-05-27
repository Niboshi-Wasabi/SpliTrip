export const LP_SPRING = {
  type: "spring" as const,
  stiffness: 100,
  damping: 22,
};

export const LP_FADE_UP = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: LP_SPRING,
  },
};

export const LP_STAGGER = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.06,
    },
  },
};

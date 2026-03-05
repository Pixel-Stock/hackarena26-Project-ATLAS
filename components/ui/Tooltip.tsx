'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   ATLAS — Tooltip Component
   ============================================================ */

interface TooltipProps {
    content: string;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

function Tooltip({ content, children, position = 'top' }: TooltipProps) {
    const [show, setShow] = useState(false);

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`
              absolute z-50 whitespace-nowrap
              px-2.5 py-1.5
              rounded-lg
              bg-[var(--bg-elevated)]
              border border-[var(--border-subtle)]
              text-xs text-[var(--text-primary)]
              shadow-lg
              pointer-events-none
              ${positionStyles[position]}
            `}
                    >
                        {content}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export { Tooltip, type TooltipProps };

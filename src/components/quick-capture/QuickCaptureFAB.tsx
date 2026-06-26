"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QuickCaptureModal } from "./QuickCaptureModal";

export function QuickCaptureFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-sage shadow-lg flex items-center justify-center text-white"
        aria-label="Quick Capture"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && <QuickCaptureModal onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

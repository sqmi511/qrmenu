import { motion } from "framer-motion";
import { ArrowRight, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import { LangToggle, ThemeToggle } from "../components/ui/Toggles";
import { usePrefs } from "../context/prefs-context";
import { spring } from "../lib/motion";

export default function Home() {
  const { t } = usePrefs();
  return (
    <PageTransition>
      <div className="relative grid min-h-dvh place-items-center px-6">
        <div className="absolute end-4 top-4 flex gap-2">
          <ThemeToggle />
          <LangToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex max-w-md flex-col items-center gap-5 text-center"
        >
          <span className="grid h-20 w-20 place-items-center rounded-card bg-brand text-white shadow-lift">
            <QrCode className="h-9 w-9" aria-hidden />
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight">QR Menu</h1>
          <p className="text-muted">{t.tagline}</p>
          <Link
            to="/r/demo?table=5"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 font-semibold text-white shadow-soft transition hover:brightness-110 active:scale-95"
          >
            {t.demoCta}
            <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
          </Link>
        </motion.div>
      </div>
    </PageTransition>
  );
}
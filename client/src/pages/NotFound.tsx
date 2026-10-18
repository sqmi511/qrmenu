import { Link } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import { ErrorState } from "../components/ui/Feedback";
import { usePrefs } from "../context/prefs-context";

export default function NotFound() {
  const { t } = usePrefs();
  return (
    <PageTransition>
      <div className="grid min-h-dvh place-items-center">
        <ErrorState
          title={t.pageNotFound}
          action={
            <Link to="/" className="mt-2 inline-flex h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
              {t.home}
            </Link>
          }
        />
      </div>
    </PageTransition>
  );
}
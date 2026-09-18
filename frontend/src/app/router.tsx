import { useEffect } from 'react';
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { About } from '../pages/About';
import { AskAll4Knox } from '../pages/AskAll4Knox';
import { ClinicalSources } from '../pages/ClinicalSources';
import { GuidedDosing } from '../pages/guided/GuidedDosing';
import { GuidedInduction } from '../pages/guided/GuidedInduction';
import { GuidedPrescribing } from '../pages/guided/GuidedPrescribing';
import { GuidedUDS } from '../pages/guided/GuidedUDS';
import { Account } from '../pages/Account';
import { ClinicalReview } from '../pages/ClinicalReview';
import { Home } from '../pages/Home';
import { SignIn } from '../pages/SignIn';
import { DosingTool } from '../pages/DosingTool';
import { LearnBuprenorphine } from '../pages/LearnBuprenorphine';
import { NotFound } from '../pages/NotFound';
import { PrescribingTool } from '../pages/PrescribingTool';
import { ReferralDirectory } from '../pages/ReferralDirectory';
import { Resources } from '../pages/Resources';
import { StartSuboxoneTool } from '../pages/StartSuboxoneTool';
import { ToolkitHome } from '../pages/ToolkitHome';
import { UDSInterpreter } from '../pages/UDSInterpreter';
import { App } from './App';

/** Reset scroll between tools; honour in-page anchors like #precipitated-withdrawal. */
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

/** Route map — skeleton §14. Phase 2 routes are intentionally absent. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        <Route element={<App />}>
          {/* `/` is the landing page: mission, partners, and routing. The
              toolkit cards are ON it, so no clinical tool is further than one
              click from the front door (skeleton §5, §27). */}
          <Route index element={<Home />} />
          <Route path="toolkit" element={<ToolkitHome />} />
          <Route path="sign-in" element={<SignIn />} />
          <Route path="account" element={<Account />} />
          <Route path="toolkit/prescribing" element={<PrescribingTool />} />
          <Route path="toolkit/start" element={<StartSuboxoneTool />} />
          <Route path="toolkit/uds" element={<UDSInterpreter />} />
          <Route path="ask" element={<AskAll4Knox />} />
          <Route path="toolkit/dosing" element={<DosingTool />} />

          {/* Guided ("one question per screen") variants of the four Phase-1
              tools — the interview UX the McNabb Center asked for. Same
              content, same deterministic engines, same API verification;
              only the presentation differs. The full-view routes above are
              unchanged and remain available from every guided result. */}
          <Route path="toolkit/prescribing/guided" element={<GuidedPrescribing />} />
          <Route path="toolkit/start/guided" element={<GuidedInduction />} />
          <Route path="toolkit/uds/guided" element={<GuidedUDS />} />
          <Route path="toolkit/dosing/guided" element={<GuidedDosing />} />
          <Route path="learn/buprenorphine" element={<LearnBuprenorphine />} />
          <Route path="referrals" element={<ReferralDirectory />} />
          <Route path="resources" element={<Resources />} />
          <Route path="about" element={<About />} />
          <Route path="clinical-sources" element={<ClinicalSources />} />
          <Route path="review" element={<ClinicalReview />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

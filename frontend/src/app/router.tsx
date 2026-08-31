import { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { About } from '../pages/About';
import { AskAll4Knox } from '../pages/AskAll4Knox';
import { ClinicalSources } from '../pages/ClinicalSources';
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
          <Route index element={<ToolkitHome />} />
          <Route path="toolkit" element={<Navigate to="/" replace />} />
          <Route path="toolkit/prescribing" element={<PrescribingTool />} />
          <Route path="toolkit/start" element={<StartSuboxoneTool />} />
          <Route path="toolkit/uds" element={<UDSInterpreter />} />
          <Route path="ask" element={<AskAll4Knox />} />
          <Route path="toolkit/dosing" element={<DosingTool />} />
          <Route path="learn/buprenorphine" element={<LearnBuprenorphine />} />
          <Route path="referrals" element={<ReferralDirectory />} />
          <Route path="resources" element={<Resources />} />
          <Route path="about" element={<About />} />
          <Route path="clinical-sources" element={<ClinicalSources />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

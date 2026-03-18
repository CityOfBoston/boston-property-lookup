import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WelcomePage from '@pages/WelcomePage';
import SearchResultsPage from '@pages/SearchResultsPage';
import PropertyDetailsPage from '@pages/PropertyDetailsPage';
import PdfGenerationPage from '@pages/PdfGenerationPage';
import MasterParcelPage from '@pages/MasterParcelPage';
import MaintenancePage from '@pages/MaintenancePage';
import { ParcelPairingsProvider } from '@hooks/useParcelPairingsContext';
import { DateProvider } from '@hooks/useDateContext';
import { GoogleAnalyticsProvider } from '@hooks/useGoogleAnalytics';
import { getComponentText } from '@utils/contentMapper';
import '@styles/main.scss';

export const App = () => {
  const config = getComponentText('config');
  return (
    <ParcelPairingsProvider>
      <Router>
        <GoogleAnalyticsProvider>
          <DateProvider>
          <Routes>
            {config.maintenance.enabled ? (
              <>
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="*" element={<Navigate to="/maintenance" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/details" element={<PropertyDetailsPage />} />
                <Route path="/master-parcel" element={<MasterParcelPage />} />
                <Route path="/form" element={<PdfGenerationPage />} />
              </>
            )}
          </Routes>
        </DateProvider>
        </GoogleAnalyticsProvider>
      </Router>
    </ParcelPairingsProvider>
  );
};

export default App; 
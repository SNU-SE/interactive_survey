
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { SurveyProvider } from './context/SurveyContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentPortal from './pages/StudentPortal';
import SurveyEditor from './pages/SurveyEditor';
import SurveyTaker from './pages/SurveyTaker';
import SubmissionSuccessPage from './pages/SubmissionSuccessPage';
import SurveyResults from './pages/SurveyResults';

const App: React.FC = () => {
  return (
    <SurveyProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col bg-slate-100">
          <Header />
          <main className="flex-grow flex flex-col">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/student" element={<StudentPortal />} />
              <Route path="/edit/:id" element={<SurveyEditor />} />
              <Route path="/survey/:id" element={<SurveyTaker />} />
              <Route path="/success" element={<SubmissionSuccessPage />} />
              <Route path="/results/:id" element={<SurveyResults />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </SurveyProvider>
  );
};

export default App;

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SurveyProvider } from './context/SurveyContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentPortal from './pages/StudentPortal';
import SurveyEditor from './pages/SurveyEditor';
import SurveyTaker from './pages/SurveyTaker';
import SubmissionSuccessPage from './pages/SubmissionSuccessPage';
import SurveyResults from './pages/SurveyResults';
import AdminLogin from './pages/AdminLogin';

const RequireTeacherAuth: React.FC<{ element: JSX.Element }> = ({ element }) => {
  const authed = typeof window !== 'undefined' && localStorage.getItem('teacherAuth') === '1';
  return authed ? element : <Navigate to="/teacher-auth" replace />;
};

const App: React.FC = () => {
  return (
    <SurveyProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col bg-slate-100">
          <Header />
          <main className="flex-grow flex flex-col">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/teacher-auth" element={<AdminLogin />} />
              <Route path="/teacher" element={<RequireTeacherAuth element={<TeacherDashboard />} />} />
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

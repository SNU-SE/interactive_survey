import React from 'react';
import { Link } from 'react-router-dom';
import { useSurveys } from '../context/SurveyContext';
import { PlusCircleIcon, BarChartIcon } from '../components/icons';

const TeacherDashboard: React.FC = () => {
  const { surveys, loadingSurveys } = useSurveys();

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Teacher Dashboard</h1>
        <Link to="/edit/new" className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
          <PlusCircleIcon />
          <span className="ml-2">Create New Survey</span>
        </Link>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-slate-700">Your Surveys</h2>
        {loadingSurveys ? (
          <p className="text-slate-500">Loading surveys...</p>
        ) : surveys.length > 0 ? (
          <ul className="space-y-3">
            {surveys.map(survey => (
              <li key={survey.id} className="p-4 border rounded-md flex justify-between items-center hover:bg-slate-50">
                <div>
                  <h3 className="font-semibold text-slate-800">{survey.title}</h3>
                  <p className="text-sm text-slate-500">
                    Code: <span className="font-mono bg-slate-200 px-2 py-1 rounded">{survey.code || survey.id}</span>
                    <span className="ml-4">Pages: {survey.pages.length}</span>
                    <span className="ml-4">Submissions: {survey.submissionCount || 0}</span>
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Link to={`/results/${survey.id}`} className="flex items-center px-4 py-2 text-sm bg-green-100 text-green-700 font-medium rounded-md hover:bg-green-200">
                    <BarChartIcon />
                    <span className="ml-2">View Results</span>
                  </Link>
                  <Link to={`/edit/${survey.id}`} className="px-4 py-2 text-sm bg-slate-200 text-slate-700 font-medium rounded-md hover:bg-slate-300">
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">You haven't created any surveys yet. Click "Create New Survey" to get started!</p>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;

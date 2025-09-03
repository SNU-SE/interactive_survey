
import React from 'react';
import { Link } from 'react-router-dom';

const SubmissionSuccessPage: React.FC = () => {
  return (
    <div className="flex-grow flex items-center justify-center bg-slate-100 text-center">
      <div className="bg-white p-12 rounded-xl shadow-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Submission Successful!</h1>
        <p className="text-slate-600 mb-6">Your responses have been recorded.</p>
        <Link to="/" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default SubmissionSuccessPage;

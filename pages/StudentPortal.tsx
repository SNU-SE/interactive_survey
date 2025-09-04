
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurveys } from '../context/SurveyContext';

const StudentPortal: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { getSurvey } = useSurveys();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter a survey code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const normalized = code.trim();
      const survey = await getSurvey(normalized);
      if (survey) {
        navigate(`/survey/${survey.id}`);
      } else {
        setError('Survey not found. Please check the code and try again.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white shadow-2xl rounded-xl px-8 pt-6 pb-8 mb-4">
          <h1 className="text-center text-2xl font-bold text-slate-800 mb-6">Enter Survey Code</h1>
          <div className="mb-4">
            <label className="block text-slate-700 text-sm font-bold mb-2" htmlFor="survey-code">
              Survey Code
            </label>
            <input
              id="survey-code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              placeholder="e.g., 123-456"
              className="shadow appearance-none border rounded w-full py-3 px-4 text-slate-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="flex items-center justify-center">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:bg-slate-400"
            >
              {loading ? 'Verifying...' : 'Start Survey'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentPortal;

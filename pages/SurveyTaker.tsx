import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSurveys } from '../context/SurveyContext';
import { Survey, Question, QuestionType, Answer } from '../types';
import AudioPlayer from '../components/AudioPlayer';

const SurveyTaker: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSurvey, addSubmission } = useSurveys();
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map());
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  useEffect(() => {
    const fetchSurvey = async () => {
      setLoading(true);
      if (id) {
        const surveyData = await getSurvey(id);
        if (surveyData) {
          setSurvey(surveyData);
          // Start with no pre-selected answers
          setAnswers(new Map());
        }
      }
      setLoading(false);
    };
    fetchSurvey();
  }, [id, getSurvey]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => {
      const newAnswers = new Map(prev);
      const question = survey?.pages.flatMap(p => p.questions).find(q => q.id === questionId);

      if (question?.type === QuestionType.MULTIPLE_CHOICE) {
        const existing = (newAnswers.get(questionId) as string[]) || [];
        if (existing.includes(value)) {
          newAnswers.set(questionId, existing.filter(v => v !== value));
        } else {
          newAnswers.set(questionId, [...existing, value]);
        }
      } else {
        newAnswers.set(questionId, value);
      }
      return newAnswers;
    });
  };

  const handleSubmit = async () => {
    if (!survey) return;

    const formattedAnswers: Answer[] = Array.from(answers.entries()).map(([questionId, value]) => ({
      questionId,
      value
    }));

    await addSubmission({
      surveyId: survey.id,
      answers: formattedAnswers,
    });

    navigate('/success');
  };

  if (loading) {
    return <div className="text-center p-8">Loading survey...</div>;
  }

  if (!survey || !survey.pages || survey.pages.length === 0) {
    return <div className="text-center p-8">Survey not found or has no pages.</div>;
  }

  const currentPage = survey.pages[currentPageIndex];

  const renderQuestionForTaker = (q: Question) => {
    switch (q.type) {
      case QuestionType.SHORT_ANSWER:
        return (
          <div key={q.id} style={{ left: `${q.x}%`, top: `${q.y}%`, width: `${q.width}%`, height: `${q.height}%`, position: 'absolute' }}>
            <textarea 
              placeholder="Type your answer here..."
              value={(answers.get(q.id) as string) || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              className="w-full h-full p-2 border-2 border-blue-500 bg-white rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" 
            />
          </div>
        );
      case QuestionType.SINGLE_CHOICE:
        return q.options.map(opt => (
          <div key={opt.id} style={{ left: `${opt.x}%`, top: `${opt.y}%`, position: 'absolute', transform: 'translate(-50%, -50%)' }}>
            <input
              type="radio"
              name={q.id}
              id={opt.id}
              value={opt.id}
              checked={answers.get(q.id) === opt.id}
              onChange={() => handleAnswerChange(q.id, opt.id)}
              className="absolute opacity-0 w-8 h-8 cursor-pointer peer z-10"
            />
            <div className="w-8 h-8 rounded-full shadow-lg transition-colors border-2 bg-white border-slate-400 peer-hover:border-slate-600 peer-checked:bg-slate-800 peer-checked:border-slate-800 transform peer-hover:scale-110"></div>
          </div>
        ));
      case QuestionType.MULTIPLE_CHOICE:
        return q.options.map(opt => {
          const isChecked = (answers.get(q.id) as string[] || []).includes(opt.id);
          return (
            <div key={opt.id} style={{ left: `${opt.x}%`, top: `${opt.y}%`, position: 'absolute', transform: 'translate(-50%, -50%)' }}>
              <input
                type="checkbox"
                name={q.id}
                id={opt.id}
                value={opt.id}
                checked={isChecked}
                onChange={() => handleAnswerChange(q.id, opt.id)}
                className="absolute opacity-0 w-8 h-8 cursor-pointer peer z-10"
              />
              <div className="w-8 h-8 rounded-md shadow-lg transition-colors border-2 bg-white border-slate-400 peer-hover:border-slate-600 peer-checked:bg-slate-800 peer-checked:border-slate-800 transform peer-hover:scale-110 flex items-center justify-center">
                {isChecked && <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
              </div>
            </div>
          );
        });
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-8">
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
            <h1 className="text-3xl font-bold text-slate-800">{survey.title}</h1>
            <p className="text-slate-600">Click or type on the image to answer the questions.</p>
        </div>
      
      {currentPage.audioUrl && (
        <div className="max-w-4xl mx-auto mb-4">
          <AudioPlayer audioUrl={currentPage.audioUrl} className="w-full" />
        </div>
      )}
      
      <div className="relative w-full max-w-4xl mx-auto bg-white p-2 rounded-lg shadow-lg">
        <img src={currentPage.backgroundImage} alt={`Survey background page ${currentPageIndex + 1}`} className="w-full h-auto rounded-md" />
        {currentPage.questions.map(renderQuestionForTaker)}
      </div>
      <div className="flex justify-between items-center mt-8 max-w-4xl mx-auto">
        <button 
            onClick={() => setCurrentPageIndex(i => i - 1)}
            disabled={currentPageIndex === 0}
            className="px-8 py-3 bg-slate-500 text-white font-bold rounded-lg shadow-md hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            Previous
        </button>
        <span className="text-slate-600 font-semibold">
            Page {currentPageIndex + 1} of {survey.pages.length}
        </span>
        {currentPageIndex < survey.pages.length - 1 ? (
            <button
                onClick={() => setCurrentPageIndex(i => i + 1)}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
            >
                Next
            </button>
        ) : (
             <button onClick={handleSubmit} className="px-12 py-4 bg-green-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-green-700 transition-transform transform hover:scale-105">
                Submit My Answers
            </button>
        )}
      </div>
    </div>
  );
};

export default SurveyTaker;

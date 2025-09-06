import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSurveys } from '../context/SurveyContext';
import { Survey, Question, QuestionType, Answer, AudioButton } from '../types';
import AudioPlayer from '../components/AudioPlayer';
import MiniAudioPlayer from '../components/MiniAudioPlayer';

const SurveyTaker: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSurvey, addSubmission } = useSurveys();
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map());
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());

  const validateCurrentPage = () => {
    if (!survey) return true;
    
    const currentPage = survey.pages[currentPageIndex];
    const requiredQuestions = currentPage.questions.filter(q => q.required);
    const errors = new Set<string>();
    
    requiredQuestions.forEach(question => {
      const answer = answers.get(question.id);
      
      if (question.type === QuestionType.SHORT_ANSWER) {
        if (!answer || (typeof answer === 'string' && answer.trim() === '')) {
          errors.add(question.id);
        }
      } else if (question.type === QuestionType.SINGLE_CHOICE) {
        if (!answer || answer === '') {
          errors.add(question.id);
        }
      } else if (question.type === QuestionType.MULTIPLE_CHOICE) {
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          errors.add(question.id);
        }
      }
    });
    
    setValidationErrors(errors);
    return errors.size === 0;
  };

  useEffect(() => {
    const fetchSurvey = async () => {
      setLoading(true);
      if (id) {
        const surveyData = await getSurvey(id);
        console.log(`🎯 [SurveyTaker] Received survey data for ID ${id}:`, surveyData);
        
        if (surveyData) {
          console.log(`🎯 [SurveyTaker] Survey audioFiles:`, surveyData.audioFiles);
          surveyData.pages.forEach((page, index) => {
            console.log(`🎯 [SurveyTaker] Page ${index} audioButtons:`, page.audioButtons);
          });
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
        const hasError = validationErrors.has(q.id);
        return (
          <div key={q.id} style={{ left: `${q.x}%`, top: `${q.y}%`, width: `${q.width}%`, height: `${q.height}%`, position: 'absolute' }}>
            <textarea 
              placeholder={q.required ? "Type your answer here... *" : "Type your answer here..."}
              value={(answers.get(q.id) as string) || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              className={`w-full h-full p-2 border-2 bg-white rounded-md shadow-md focus:outline-none focus:ring-2 resize-none ${
                hasError ? 'border-red-500 focus:ring-red-400' : 'border-blue-500 focus:ring-blue-400'
              }`}
            />
            {q.required && (
              <span className="absolute -top-1 -right-1 text-red-500 font-bold text-lg">*</span>
            )}
          </div>
        );
      case QuestionType.SINGLE_CHOICE:
        const singleHasError = validationErrors.has(q.id);
        return q.options.map((opt, index) => (
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
            <div className={`w-8 h-8 rounded-full shadow-lg transition-colors border-2 bg-white transform peer-hover:scale-110 ${
              singleHasError ? 'border-red-400 peer-hover:border-red-600' : 'border-slate-400 peer-hover:border-slate-600'
            } peer-checked:bg-slate-800 peer-checked:border-slate-800 relative`}>
              {q.required && index === 0 && (
                <span className="absolute -top-1 -right-1 text-red-500 font-bold text-sm bg-white rounded-full w-3 h-3 flex items-center justify-center" style={{ fontSize: '10px' }}>*</span>
              )}
            </div>
          </div>
        ));
      case QuestionType.MULTIPLE_CHOICE:
        const multipleHasError = validationErrors.has(q.id);
        return q.options.map((opt, index) => {
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
              <div className={`w-8 h-8 rounded-md shadow-lg transition-colors border-2 bg-white transform peer-hover:scale-110 flex items-center justify-center relative ${
                multipleHasError ? 'border-red-400 peer-hover:border-red-600' : 'border-slate-400 peer-hover:border-slate-600'
              } peer-checked:bg-slate-800 peer-checked:border-slate-800`}>
                {isChecked && <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                {q.required && index === 0 && (
                  <span className="absolute -top-1 -right-1 text-red-500 font-bold text-sm bg-white rounded-full w-3 h-3 flex items-center justify-center" style={{ fontSize: '10px' }}>*</span>
                )}
              </div>
            </div>
          );
        });
      default:
        return null;
    }
  };

  const renderAudioButtonForTaker = (audioButton: AudioButton) => {
    console.log(`🎵 [SurveyTaker] Rendering audioButton:`, audioButton);
    console.log(`🎵 [SurveyTaker] Available audioFiles:`, survey?.audioFiles);
    
    // Get the audio file from the global pool
    const audioFile = survey?.audioFiles?.find(af => af.id === audioButton.audioFileId);
    console.log(`🎵 [SurveyTaker] Found audioFile for ${audioButton.audioFileId}:`, audioFile);
    
    if (!audioFile) {
      // Fallback for legacy data
      if (audioButton.audioUrl) {
        return (
          <div 
            key={audioButton.id} 
            style={{ 
              left: `${audioButton.x}%`, 
              top: `${audioButton.y}%`, 
              position: 'absolute', 
              transform: 'translate(-50%, -50%)',
              zIndex: 10
            }}
          >
            <MiniAudioPlayer 
              audioUrl={audioButton.audioUrl}
              label={audioButton.label}
            />
          </div>
        );
      }
      return null;
    }

    // Get the audio button number based on its position in the survey's audioFiles array
    const audioButtonNumber = survey.audioFiles.findIndex(af => af.id === audioButton.audioFileId) + 1;
    
    return (
      <div 
        key={audioButton.id} 
        style={{ 
          left: `${audioButton.x}%`, 
          top: `${audioButton.y}%`, 
          position: 'absolute', 
          transform: 'translate(-50%, -50%)',
          zIndex: 10
        }}
      >
        <MiniAudioPlayer 
          audioUrl={audioFile.audioUrl}
          label={`${audioButtonNumber}`}
        />
      </div>
    );
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
        {currentPage.audioButtons?.map(renderAudioButtonForTaker)}
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
                onClick={() => {
                  if (validateCurrentPage()) {
                    setCurrentPageIndex(i => i + 1);
                  } else {
                    alert('필수 문항을 모두 작성해주세요.');
                  }
                }}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
            >
                Next
            </button>
        ) : (
             <button onClick={() => {
               if (validateCurrentPage()) {
                 handleSubmit();
               } else {
                 alert('필수 문항을 모두 작성해주세요.');
               }
             }} className="px-12 py-4 bg-green-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-green-700 transition-transform transform hover:scale-105">
                Submit My Answers
            </button>
        )}
      </div>
    </div>
  );
};

export default SurveyTaker;

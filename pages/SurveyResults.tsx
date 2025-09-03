import React, { useMemo, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSurveys } from '../context/SurveyContext';
import { Question, QuestionType, ChoiceQuestion, Survey } from '../types';

// Make SheetJS library available in the component
declare var XLSX: any;

const SurveyResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getSurvey, submissions, fetchSubmissionsForSurvey, loadingSubmissions } = useSurveys();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loadingSurvey, setLoadingSurvey] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        setLoadingSurvey(true);
        const surveyData = await getSurvey(id);
        if (surveyData) {
          setSurvey(surveyData);
        }
        setLoadingSurvey(false);
        await fetchSubmissionsForSurvey(id);
      }
    };
    loadData();
  }, [id, getSurvey, fetchSubmissionsForSurvey]);

  const allQuestions = useMemo(() => survey?.pages.flatMap(p => p.questions) || [], [survey]);

  const getNumericAnswer = (question: Question, answerValue: string | string[]): string => {
      if (question.type !== QuestionType.SINGLE_CHOICE && question.type !== QuestionType.MULTIPLE_CHOICE) {
          return Array.isArray(answerValue) ? answerValue.join(', ') : answerValue;
      }
      const choiceQ = question as ChoiceQuestion;
      const answerValues = Array.isArray(answerValue) ? answerValue : [answerValue];
      
      return answerValues.map(optionId => {
          const index = choiceQ.options.findIndex(opt => opt.id === optionId);
          return index !== -1 ? (index + 1).toString() : `(unknown)`;
      }).join(', ');
  }

  const handleExport = () => {
    if (!survey) return;

    // Header Row
    const headers = ["Submission ID", ...allQuestions.map((q, i) => `Q${i + 1} (${q.type})`)];
    
    // Data Rows
    const data = submissions.map(sub => {
      const row: (string | number)[] = [sub.id];
      allQuestions.forEach(q => {
        const answer = sub.answers.find(a => a.questionId === q.id);
        if (!answer) {
          row.push("");
          return;
        }
        row.push(getNumericAnswer(q, answer.value));
      });
      return row;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");

    XLSX.writeFile(workbook, `${survey.title.replace(/ /g, "_")}_Results.xlsx`);
  };

  if (loadingSurvey) {
    return <div className="text-center p-8">Loading results...</div>;
  }

  if (!survey) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-slate-700">Survey not found.</h1>
        <Link to="/teacher" className="text-blue-600 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{survey.title} - Results</h1>
          <p className="text-slate-600">{loadingSubmissions ? 'Loading...' : `${submissions.length} submission(s)`}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={submissions.length === 0 || loadingSubmissions}
          className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          Export to Excel
        </button>
      </div>

      {loadingSubmissions ? (
        <p>Loading submissions...</p>
      ) : submissions.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-3 font-semibold text-slate-600 border-b-2">Submission</th>
                {allQuestions.map((q, index) => (
                  <th key={q.id} className="p-3 font-semibold text-slate-600 border-b-2" title={q.id}>
                    Q{index + 1}
                    <span className="block text-xs font-normal text-slate-400">
                      {q.type === QuestionType.SHORT_ANSWER ? 'Short Ans.' : q.type === QuestionType.SINGLE_CHOICE ? 'Single' : 'Multi'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, index) => (
                <tr key={sub.id} className="hover:bg-slate-50 border-b">
                  <td className="p-3 text-slate-800 font-mono text-sm" title={sub.id}>Submission #{index + 1}</td>
                  {allQuestions.map(q => {
                    const answer = sub.answers.find(a => a.questionId === q.id);
                    const value = answer ? getNumericAnswer(q, answer.value) : <span className="text-slate-400">N/A</span>;
                    return <td key={q.id} className="p-3 text-slate-800">{value}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center bg-white p-12 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-slate-700">No submissions yet.</h2>
          <p className="text-slate-500 mt-2">Share the survey code <span className="font-mono bg-slate-200 px-2 py-1 rounded">{survey.id}</span> with your students!</p>
        </div>
      )}
    </div>
  );
};

export default SurveyResults;

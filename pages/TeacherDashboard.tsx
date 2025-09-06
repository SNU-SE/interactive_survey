import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSurveys } from '../context/SurveyContext';
import { PlusCircleIcon, BarChartIcon, TrashIcon } from '../components/icons';

const TeacherDashboard: React.FC = () => {
  const { surveys, loadingSurveys, deleteSurvey } = useSurveys();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sort surveys by creation date (newest first)
  const sortedSurveys = surveys.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Unknown date';
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        ) : sortedSurveys.length > 0 ? (
          <ul className="space-y-3">
            {sortedSurveys.map(survey => (
              <li key={survey.id} className="p-4 border rounded-md flex justify-between items-center hover:bg-slate-50">
                <div>
                  <h3 className="font-semibold text-slate-800">{survey.title}</h3>
                  <p className="text-sm text-slate-500">
                    Code: <span className="font-mono bg-slate-200 px-2 py-1 rounded">{survey.code || survey.id}</span>
                    <span className="ml-4">Pages: {survey.pages.length}</span>
                    <span className="ml-4">Submissions: {survey.submissionCount || 0}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Created: {formatDate(survey.createdAt)}
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
                  <button 
                    onClick={() => {
                      setSurveyToDelete({ id: survey.id, title: survey.title });
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                    title="Delete Survey"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">You haven't created any surveys yet. Click "Create New Survey" to get started!</p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && surveyToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4">설문지 삭제</h3>
            <p className="text-slate-600 mb-6">
              <span className="font-semibold">"{surveyToDelete.title}"</span> 설문지를 정말 삭제하시겠습니까?
              <br /><br />
              <span className="text-red-600 font-medium">이 작업은 되돌릴 수 없으며, 모든 응답 데이터도 함께 삭제됩니다.</span>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSurveyToDelete(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-slate-600 bg-slate-200 rounded-md hover:bg-slate-300 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteSurvey(surveyToDelete.id);
                    setShowDeleteModal(false);
                    setSurveyToDelete(null);
                  } catch (error) {
                    console.error('Delete error:', error);
                    alert('설문 삭제 중 오류가 발생했습니다.');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    삭제 중...
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;

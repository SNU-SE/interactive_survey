import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Survey, Submission } from '../types';

interface SurveyContextType {
  surveys: Survey[];
  loadingSurveys: boolean;
  getSurvey: (id: string) => Promise<Survey | undefined>;
  addSurvey: (survey: Omit<Survey, 'id'>) => Promise<Survey>;
  updateSurvey: (survey: Survey) => Promise<void>;
  submissions: Submission[];
  loadingSubmissions: boolean;
  addSubmission: (submission: Omit<Submission, 'id'>) => Promise<void>;
  fetchSubmissionsForSurvey: (surveyId: string) => Promise<void>;
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined);

// Helper function to get data from localStorage safely
const getFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key "${key}":`, error);
        return defaultValue;
    }
};

export const SurveyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [surveys, setSurveys] = useState<Survey[]>(() => getFromLocalStorage<Survey[]>('surveys', []));
  const [loadingSurveys, setLoadingSurveys] = useState<boolean>(false); // localStorage is synchronous
  const [submissions, setSubmissions] = useState<Submission[]>([]); // For a specific survey
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);

  // Persist surveys to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('surveys', JSON.stringify(surveys));
    } catch (error) {
      console.error('Failed to save surveys to localStorage:', error);
    }
  }, [surveys]);

  const getSurvey = useCallback(async (id: string) => {
    return surveys.find(s => s.id === id);
  }, [surveys]);

  const addSurvey = async (surveyData: Omit<Survey, 'id'>) => {
    // Images are already base64, no upload needed.
    const newSurvey: Survey = {
      ...surveyData,
      id: `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      submissionCount: 0,
    };
    setSurveys(prev => [...prev, newSurvey]);
    return newSurvey;
  };

  const updateSurvey = async (updatedSurvey: Survey) => {
    // Images are already base64, no upload needed.
    setSurveys(prev => prev.map(s => s.id === updatedSurvey.id ? updatedSurvey : s));
  };

  const addSubmission = async (submissionData: Omit<Submission, 'id'>) => {
    const allSubmissions = getFromLocalStorage<Submission[]>('submissions', []);
    const newSubmission: Submission = {
      ...submissionData,
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
    
    try {
      localStorage.setItem('submissions', JSON.stringify([...allSubmissions, newSubmission]));
    } catch (error) {
      console.error('Failed to save submission to localStorage:', error);
    }
    
    // Update submission count on the corresponding survey
    setSurveys(prev => prev.map(s => 
        s.id === submissionData.surveyId 
            ? { ...s, submissionCount: (s.submissionCount || 0) + 1 } 
            : s
    ));
  };

  const fetchSubmissionsForSurvey = useCallback(async (surveyId: string) => {
    setLoadingSubmissions(true);
    const allSubmissions = getFromLocalStorage<Submission[]>('submissions', []);
    const surveySubmissions = allSubmissions.filter(s => s.surveyId === surveyId);
    setSubmissions(surveySubmissions);
    setLoadingSubmissions(false);
  }, []);


  return (
    <SurveyContext.Provider value={{ surveys, loadingSurveys, getSurvey, addSurvey, updateSurvey, submissions, loadingSubmissions, addSubmission, fetchSubmissionsForSurvey }}>
      {children}
    </SurveyContext.Provider>
  );
};

export const useSurveys = () => {
  const context = useContext(SurveyContext);
  if (context === undefined) {
    throw new Error('useSurveys must be used within a SurveyProvider');
  }
  return context;
};
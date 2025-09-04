import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Survey, Submission } from '../types';
import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

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


export const SurveyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState<boolean>(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);

  // Load surveys from Firebase on mount
  useEffect(() => {
    const loadSurveys = async () => {
      try {
        setLoadingSurveys(true);
        const surveysSnapshot = await getDocs(collection(db, 'surveys'));
        const surveysData: Survey[] = [];
        surveysSnapshot.forEach((doc) => {
          surveysData.push({ id: doc.id, ...doc.data() } as Survey);
        });
        setSurveys(surveysData);
      } catch (error) {
        console.error('Error loading surveys from Firebase:', error);
        setSurveys([]);
      } finally {
        setLoadingSurveys(false);
      }
    };

    loadSurveys();
  }, []);

  const getSurvey = useCallback(async (id: string) => {
    return surveys.find(s => s.id === id);
  }, [surveys]);

  const addSurvey = async (surveyData: Omit<Survey, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'surveys'), {
        ...surveyData,
        submissionCount: 0,
        createdAt: new Date()
      });
      
      const newSurvey: Survey = {
        ...surveyData,
        id: docRef.id,
        submissionCount: 0,
      };
      
      setSurveys(prev => [...prev, newSurvey]);
      return newSurvey;
    } catch (error) {
      console.error('Error saving survey to Firebase:', error);
      throw new Error('설문 저장에 실패했습니다. Firebase 연결을 확인해주세요.');
    }
  };

  const updateSurvey = async (updatedSurvey: Survey) => {
    try {
      await updateDoc(doc(db, 'surveys', updatedSurvey.id), {
        ...updatedSurvey,
        updatedAt: new Date()
      });
      
      setSurveys(prev => prev.map(s => s.id === updatedSurvey.id ? updatedSurvey : s));
    } catch (error) {
      console.error('Error updating survey in Firebase:', error);
      throw new Error('설문 업데이트에 실패했습니다. Firebase 연결을 확인해주세요.');
    }
  };

  const addSubmission = async (submissionData: Omit<Submission, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'submissions'), {
        ...submissionData,
        submittedAt: new Date()
      });
      
      const newSubmission: Submission = {
        ...submissionData,
        id: docRef.id,
      };
      
      // Update submission count on the corresponding survey
      const surveyRef = doc(db, 'surveys', submissionData.surveyId);
      const currentSurvey = surveys.find(s => s.id === submissionData.surveyId);
      if (currentSurvey) {
        await updateDoc(surveyRef, {
          submissionCount: (currentSurvey.submissionCount || 0) + 1
        });
        
        setSurveys(prev => prev.map(s => 
            s.id === submissionData.surveyId 
                ? { ...s, submissionCount: (s.submissionCount || 0) + 1 } 
                : s
        ));
      }
      
    } catch (error) {
      console.error('Error saving submission to Firebase:', error);
      throw new Error('응답 저장에 실패했습니다. Firebase 연결을 확인해주세요.');
    }
  };

  const fetchSubmissionsForSurvey = useCallback(async (surveyId: string) => {
    setLoadingSubmissions(true);
    try {
      const q = query(collection(db, 'submissions'), where('surveyId', '==', surveyId));
      const submissionsSnapshot = await getDocs(q);
      const submissionsData: Submission[] = [];
      submissionsSnapshot.forEach((doc) => {
        submissionsData.push({ id: doc.id, ...doc.data() } as Submission);
      });
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error fetching submissions from Firebase:', error);
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
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
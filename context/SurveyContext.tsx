import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Survey, Submission } from '../types';
import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';

interface SurveyContextType {
  surveys: Survey[];
  loadingSurveys: boolean;
  getSurvey: (idOrCode: string) => Promise<Survey | undefined>;
  addSurvey: (survey: Omit<Survey, 'id' | 'code'>) => Promise<Survey>;
  updateSurvey: (survey: Survey) => Promise<void>;
  deleteSurvey: (surveyId: string) => Promise<void>;
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

  // Helper: generate unique 3-digit-3-digit code
  const generateUniqueCode = useCallback(async (): Promise<string> => {
    const pad3 = (n: number) => n.toString().padStart(3, '0');
    for (let i = 0; i < 50; i++) {
      const code = `${pad3(Math.floor(Math.random() * 1000))}-${pad3(Math.floor(Math.random() * 1000))}`;
      const snap = await getDocs(query(collection(db, 'surveys'), where('code', '==', code)));
      if (snap.empty) return code;
    }
    throw new Error('코드 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }, []);

  // Load surveys from Firebase on mount
  useEffect(() => {
    const loadSurveys = async () => {
      try {
        setLoadingSurveys(true);
        const surveysSnapshot = await getDocs(collection(db, 'surveys'));
        const surveysData: Survey[] = [];
        surveysSnapshot.forEach((doc) => {
          const rawData = doc.data();
          const survey = { id: doc.id, ...rawData } as Survey;
          
          // Migration: ensure audioFiles array exists
          if (!survey.audioFiles) {
            survey.audioFiles = [];
          }
          
          // Migration: convert legacy audioUrl to audioFiles and audioButtons
          survey.pages = survey.pages.map(page => {
            const migratedPage = { ...page };
            
            // Ensure audioButtons array exists
            if (!migratedPage.audioButtons) {
              migratedPage.audioButtons = [];
            }
            
            // If page has legacy audioUrl but no audioButtons, migrate it
            if (page.audioUrl && migratedPage.audioButtons.length === 0) {
              // Create an AudioFile entry for the legacy audio
              const audioFileId = `legacy-${page.id}`;
              const audioFile = {
                id: audioFileId,
                name: `Audio for Page ${survey.pages.indexOf(page) + 1}`,
                audioUrl: page.audioUrl,
              };
              
              // Add to survey's audioFiles if not already there
              if (!survey.audioFiles.find(af => af.id === audioFileId)) {
                survey.audioFiles.push(audioFile);
              }
              
              // Create an AudioButton referencing this file
              const audioButton = {
                id: `btn-${audioFileId}`,
                x: 50, // Center position
                y: 10, // Top position
                audioFileId: audioFileId,
                label: `Audio for Page ${survey.pages.indexOf(page) + 1}`,
                audioUrl: page.audioUrl // Keep for backward compatibility
              };
              
              migratedPage.audioButtons.push(audioButton);
            }
            
            return migratedPage;
          });
          
          surveysData.push(survey);
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

  const getSurvey = useCallback(async (idOrCode: string) => {
    const byId = surveys.find(s => s.id === idOrCode);
    if (byId) return byId;
    // If not found by id and looks like ###-###, try by code
    if (/^\d{3}-\d{3}$/.test(idOrCode)) {
      try {
        const qSnap = await getDocs(query(collection(db, 'surveys'), where('code', '==', idOrCode)));
        if (!qSnap.empty) {
          const d = qSnap.docs[0];
          return { id: d.id, ...(d.data() as Omit<Survey, 'id'>) } as Survey;
        }
      } catch (e) {
        console.error('Failed to query survey by code', e);
      }
    }
    return undefined;
  }, [surveys]);

  const addSurvey = async (surveyData: Omit<Survey, 'id' | 'code'>) => {
    try {
      const code = await generateUniqueCode();
      const docRef = await addDoc(collection(db, 'surveys'), {
        ...surveyData,
        code,
        submissionCount: 0,
        createdAt: new Date()
      });
      
      const newSurvey: Survey = {
        ...surveyData,
        id: docRef.id,
        code,
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

  const deleteSurvey = async (surveyId: string) => {
    try {
      // Create a batch to delete survey and all related submissions
      const batch = writeBatch(db);
      
      // Delete the survey document
      const surveyRef = doc(db, 'surveys', surveyId);
      batch.delete(surveyRef);
      
      // Find and delete all submissions for this survey
      const submissionsQuery = query(collection(db, 'submissions'), where('surveyId', '==', surveyId));
      const submissionsSnapshot = await getDocs(submissionsQuery);
      
      submissionsSnapshot.forEach((submissionDoc) => {
        batch.delete(submissionDoc.ref);
      });
      
      // Commit the batch
      await batch.commit();
      
      // Update local state
      setSurveys(prev => prev.filter(s => s.id !== surveyId));
      
      console.log(`Successfully deleted survey ${surveyId} and ${submissionsSnapshot.size} related submissions`);
      
    } catch (error) {
      console.error('Error deleting survey from Firebase:', error);
      throw new Error('설문 삭제에 실패했습니다. Firebase 연결을 확인해주세요.');
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
    <SurveyContext.Provider value={{ surveys, loadingSurveys, getSurvey, addSurvey, updateSurvey, deleteSurvey, submissions, loadingSubmissions, addSubmission, fetchSubmissionsForSurvey }}>
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

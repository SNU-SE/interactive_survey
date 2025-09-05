import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSurveys } from '../context/SurveyContext';
import { Survey, Question, QuestionType, ChoiceOption, ShortAnswerQuestion, ChoiceQuestion, SurveyPage, AudioButton, AudioFile } from '../types';
import { CheckCircleIcon, ListChecksIcon, TextInputIcon, TrashIcon, MoveIcon } from '../components/icons';
import AudioPlayer from '../components/AudioPlayer';

type Tool = QuestionType | 'DELETE' | 'MOVE' | 'AUDIO_BUTTON' | 'NONE';

interface DraggingItem {
  questionId?: string;
  optionId?: string;
  audioButtonId?: string;
  startX: number; // Percentage offset within the element
  startY: number; // Percentage offset within the element
}

const SurveyEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSurvey, addSurvey, updateSurvey } = useSurveys();

  const [survey, setSurvey] = useState<Partial<Survey>>({ title: '', pages: [], audioFiles: [] });
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentTool, setCurrentTool] = useState<Tool>('NONE');
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [draggingItem, setDraggingItem] = useState<DraggingItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAudioFileId, setPendingAudioFileId] = useState<string | null>(null);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Migration helper function
  const migrateAudioUrl = (page: SurveyPage): SurveyPage => {
    if (page.audioUrl && (!page.audioButtons || page.audioButtons.length === 0)) {
      return {
        ...page,
        audioButtons: [{
          id: `audio_${Date.now()}`,
          x: 50, // Center position
          y: 10, // Top position
          audioUrl: page.audioUrl,
          label: 'Play Audio'
        }]
      };
    }
    return {
      ...page,
      audioButtons: page.audioButtons || []
    };
  };

  useEffect(() => {
    const loadSurvey = async () => {
      if (id && id !== 'new') {
        setIsLoading(true);
        const existingSurvey = await getSurvey(id);
        if (existingSurvey) {
          // Migrate existing audioUrl to audioButtons
          const migratedSurvey = {
            ...existingSurvey,
            pages: existingSurvey.pages?.map(migrateAudioUrl) || []
          };
          setSurvey(migratedSurvey);
        }
        setIsLoading(false);
      } else {
          setSurvey({ title: '', pages: [], audioFiles: [] });
      }
      setCurrentPageIndex(0);
    }
    loadSurvey();
  }, [id, getSurvey]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (files.length > imageFiles.length) {
      alert("Some files were not images and were ignored.");
    }

    const filePromises = imageFiles.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then(base64Images => {
      const newPages: SurveyPage[] = base64Images.map(imgData => ({
        id: `p${Date.now()}${Math.random()}`,
        backgroundImage: imgData,
        audioButtons: [],
        questions: [],
      }));

      setSurvey(s => {
        const updatedPages = [...(s.pages || []), ...newPages];
        if ((s.pages || []).length === 0 && updatedPages.length > 0) {
            setCurrentPageIndex(0);
        }
        return { ...s, pages: updatedPages };
      });
    });

    e.target.value = '';
  };

  const handleAudioFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
    if (files.length > audioFiles.length) {
      alert("Some files were not audio files and were ignored.");
    }

    const filePromises = audioFiles.map(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`${file.name} is too large. Files must be smaller than 10MB.`);
        return null;
      }
      
      return new Promise<AudioFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Create audio element to get duration
          const audio = new Audio();
          audio.onloadedmetadata = () => {
            resolve({
              id: `audio_${Date.now()}_${Math.random()}`,
              name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
              audioUrl: reader.result as string,
              duration: audio.duration
            });
          };
          audio.onerror = () => {
            resolve({
              id: `audio_${Date.now()}_${Math.random()}`,
              name: file.name.replace(/\.[^/.]+$/, ""),
              audioUrl: reader.result as string
            });
          };
          audio.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }).filter(promise => promise !== null) as Promise<AudioFile>[];

    Promise.all(filePromises).then(newAudioFiles => {
      setSurvey(s => ({
        ...s,
        audioFiles: [...(s.audioFiles || []), ...newAudioFiles]
      }));
    }).catch(error => {
      console.error('Audio files upload failed:', error);
      alert('Failed to upload some audio files. Please try again.');
    });

    e.target.value = '';
  };

  const deleteAudioFile = (audioFileId: string) => {
    // Remove audio file and all audio buttons that reference it
    setSurvey(s => {
      const newPages = s.pages?.map(page => ({
        ...page,
        audioButtons: page.audioButtons?.filter(ab => ab.audioFileId !== audioFileId) || []
      })) || [];
      
      return {
        ...s,
        pages: newPages,
        audioFiles: s.audioFiles?.filter(af => af.id !== audioFileId) || []
      };
    });
  };

  const deletePage = (indexToDelete: number) => {
    setSurvey(s => {
      const newPages = (s.pages || []).filter((_, index) => index !== indexToDelete);
      if (currentPageIndex >= newPages.length && newPages.length > 0) {
        setCurrentPageIndex(newPages.length - 1);
      } else if (newPages.length === 0) {
        setCurrentPageIndex(0);
      }
      return { ...s, pages: newPages };
    });
  };
  
  const handleAddQuestion = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentTool === 'NONE' || currentTool === 'DELETE' || currentTool === 'MOVE' || !imageContainerRef.current || !survey.pages || survey.pages.length === 0) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    if (currentTool === 'AUDIO_BUTTON') {
        if (pendingAudioFileId) {
          handleAudioButtonPlace(pendingAudioFileId, xPercent, yPercent);
        }
        return;
    }

    setSurvey(s => {
        const newPages = [...(s.pages || [])];
        const currentPage = { ...newPages[currentPageIndex] };
        const currentQuestions = [...currentPage.questions];
        
        if (isEditingQuestion) {
            const lastQuestion = currentQuestions[currentQuestions.length - 1];
            if (lastQuestion && (lastQuestion.type === QuestionType.SINGLE_CHOICE || lastQuestion.type === QuestionType.MULTIPLE_CHOICE)) {
                const newOption: ChoiceOption = { id: `o${Date.now()}`, x: xPercent, y: yPercent };
                (lastQuestion as ChoiceQuestion).options.push(newOption);
            }
        } else {
            let newQuestion: Question;
            if (currentTool === QuestionType.SHORT_ANSWER) {
                newQuestion = { id: `q${Date.now()}`, type: QuestionType.SHORT_ANSWER, x: xPercent, y: yPercent, width: 30, height: 8 };
                currentQuestions.push(newQuestion);
            } else {
                newQuestion = { id: `q${Date.now()}`, type: currentTool as QuestionType.SINGLE_CHOICE | QuestionType.MULTIPLE_CHOICE, options: [{ id: `o${Date.now()}`, x: xPercent, y: yPercent }] };
                currentQuestions.push(newQuestion);
            }
        }
        currentPage.questions = currentQuestions;
        newPages[currentPageIndex] = currentPage;
        return { ...s, pages: newPages };
    });
    
    if (!isEditingQuestion) {
        if (currentTool === QuestionType.SHORT_ANSWER) {
            setCurrentTool('NONE');
        } else {
            setIsEditingQuestion(true);
        }
    }
  };

  const handleAudioButtonPlace = (audioFileId: string, x: number, y: number) => {
    const audioFile = survey.audioFiles?.find(af => af.id === audioFileId);
    if (!audioFile) {
      alert('Audio file not found.');
      return;
    }

    const newAudioButton: AudioButton = {
      id: `audio_button_${Date.now()}`,
      x,
      y,
      audioFileId,
      label: audioFile.name
    };

    setSurvey(s => {
      const newPages = [...(s.pages || [])];
      const currentPage = { ...newPages[currentPageIndex] };
      newPages[currentPageIndex] = {
        ...currentPage,
        audioButtons: [...(currentPage.audioButtons || []), newAudioButton]
      };
      return { ...s, pages: newPages };
    });

    setCurrentTool('NONE');
    setPendingAudioFileId(null);
  };

  const handleDeleteAudioButton = (audioButtonId: string) => {
    setSurvey(s => {
      const newPages = [...(s.pages || [])];
      const currentPage = { ...newPages[currentPageIndex] };
      newPages[currentPageIndex] = {
        ...currentPage,
        audioButtons: currentPage.audioButtons?.filter(ab => ab.id !== audioButtonId) || []
      };
      return { ...s, pages: newPages };
    });
  };

  const handleSelectAudioFile = (audioFileId: string) => {
    if (!survey.pages || currentPageIndex >= survey.pages.length) {
      alert('Please select a page first.');
      return;
    }

    if (!survey.audioFiles || survey.audioFiles.length === 0) {
      alert('Please upload audio files first.');
      return;
    }

    setPendingAudioFileId(audioFileId);
    setCurrentTool('AUDIO_BUTTON');
    alert('Audio file selected! Now click on the image where you want to place the audio button.');
  };

  const handleDeleteQuestion = (questionId: string) => {
    setSurvey(s => {
        const newPages = [...(s.pages || [])];
        const currentPage = { ...newPages[currentPageIndex] };
        currentPage.questions = currentPage.questions.filter(q => q.id !== questionId);
        newPages[currentPageIndex] = currentPage;
        return { ...s, pages: newPages };
    });
  };

  const handleDeleteOption = (questionId: string, optionId: string) => {
     setSurvey(s => {
        const newPages = [...(s.pages || [])];
        const currentPage = { ...newPages[currentPageIndex] };
        const question = currentPage.questions.find(q => q.id === questionId) as ChoiceQuestion | undefined;
        if (question) {
            question.options = question.options.filter(opt => opt.id !== optionId);
            if (question.options.length === 0) {
                 currentPage.questions = currentPage.questions.filter(q => q.id !== questionId);
            }
        }
        newPages[currentPageIndex] = currentPage;
        return { ...s, pages: newPages };
    });
  };

  const finishEditingQuestion = () => {
      setIsEditingQuestion(false);
      setCurrentTool('NONE');
  }

  const handleSave = async () => {
    if (!survey.title || !survey.pages || survey.pages.length === 0) {
      alert('Please provide a title and at least one page.');
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (id && id !== 'new') {
          await updateSurvey({ ...survey, id } as Survey);
          navigate(`/teacher`);
      } else {
          const finalSurvey: Omit<Survey, 'id'> = {
              title: survey.title!,
              pages: survey.pages!
          };
          const newSurvey = await addSurvey(finalSurvey);
          navigate(`/edit/${newSurvey.id}`);
      }
    } catch(error) {
        console.error("Failed to save survey:", error);
        alert("An error occurred while saving the survey. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  const getCursor = () => {
    if (draggingItem) return 'grabbing';
    if (currentTool === 'MOVE') return 'move';
    if (currentTool !== 'NONE' && currentTool !== 'DELETE') return 'crosshair';
    return 'default';
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentTool !== 'MOVE' || !imageContainerRef.current || !currentPage) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const clickXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const clickYPercent = ((e.clientY - rect.top) / rect.height) * 100;
    
    for (const q of [...currentPage.questions].reverse()) {
        if (q.type === QuestionType.SHORT_ANSWER) {
            if (clickXPercent >= q.x && clickXPercent <= q.x + q.width &&
                clickYPercent >= q.y && clickYPercent <= q.y + q.height) {
                setDraggingItem({ questionId: q.id, startX: clickXPercent - q.x, startY: clickYPercent - q.y });
                return;
            }
        } else {
            for (const opt of q.options) {
                const dist = Math.sqrt(Math.pow(clickXPercent - opt.x, 2) + Math.pow(clickYPercent - opt.y, 2));
                if (dist < 3.5) { // slightly larger radius for easier grabbing
                    setDraggingItem({ questionId: q.id, optionId: opt.id, startX: clickXPercent - opt.x, startY: clickYPercent - opt.y });
                    return;
                }
            }
        }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingItem || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const newXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const newYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    setSurvey(s => {
      if (!s.pages) return s;

      const newPages = s.pages.map((page, pageIndex) => {
        if (pageIndex !== currentPageIndex) {
          return page;
        }

        const updatedQuestions = page.questions.map(q => {
          if (q.id !== draggingItem.questionId) {
            return q;
          }

          // Dragging a choice option
          if (draggingItem.optionId && q.type !== QuestionType.SHORT_ANSWER) {
            const newOptions = q.options.map(opt => {
              if (opt.id !== draggingItem.optionId) {
                return opt;
              }
              return {
                ...opt,
                x: Math.max(0, Math.min(100, newXPercent - draggingItem.startX)),
                y: Math.max(0, Math.min(100, newYPercent - draggingItem.startY)),
              };
            });
            return { ...q, options: newOptions };
          }

          // Dragging a short answer box
          if (!draggingItem.optionId && q.type === QuestionType.SHORT_ANSWER) {
            return {
              ...q,
              x: Math.max(0, Math.min(100 - q.width, newXPercent - draggingItem.startX)),
              y: Math.max(0, Math.min(100 - q.height, newYPercent - draggingItem.startY)),
            };
          }

          return q;
        });

        return { ...page, questions: updatedQuestions };
      });

      return { ...s, pages: newPages };
    });
  };
  
  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
      if (draggingItem) {
          setDraggingItem(null);
      } else {
          handleAddQuestion(e);
      }
  };

  const renderQuestion = (q: Question) => {
    const isDeleteMode = currentTool === 'DELETE';
    const isMoveMode = currentTool === 'MOVE';
    
    switch (q.type) {
      case QuestionType.SHORT_ANSWER:
        return (
          <div key={q.id} style={{ left: `${q.x}%`, top: `${q.y}%`, width: `${q.width}%`, height: `${q.height}%`, position: 'absolute', cursor: isMoveMode ? 'move' : 'default' }}>
            <div className="w-full h-full p-2 border-2 border-dashed border-blue-500 bg-blue-100 bg-opacity-50 rounded-md shadow-md text-center text-blue-800 font-semibold flex items-center justify-center">
              Short Answer
            </div>
            {isDeleteMode && (
                <div onClick={() => handleDeleteQuestion(q.id)} className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center cursor-pointer rounded-md group">
                    <TrashIcon className="h-8 w-8 text-white opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all"/>
                </div>
            )}
          </div>
        );
      case QuestionType.SINGLE_CHOICE:
      case QuestionType.MULTIPLE_CHOICE:
        const isSingle = q.type === QuestionType.SINGLE_CHOICE;
        const shapeClass = isSingle ? 'rounded-full' : 'rounded-md';
        const bgClass = isSingle ? 'bg-red-400' : 'bg-green-400';
        const ringClass = isSingle ? 'ring-red-500' : 'ring-green-500';

        return (
          <React.Fragment key={q.id}>
            {q.options.map((opt, index) => (
              <div key={opt.id} style={{ left: `${opt.x}%`, top: `${opt.y}%`, position: 'absolute', transform: 'translate(-50%, -50%)', cursor: isMoveMode ? 'move' : 'default' }}>
                <div className={`w-6 h-6 border-4 border-white ${bgClass} ${shapeClass} shadow-lg ring-2 ${ringClass} flex items-center justify-center`}>
                   <span className="text-xs font-bold text-white select-none" style={{ textShadow: '0 0 3px rgba(0,0,0,0.7)' }}>
                    {index + 1}
                   </span>
                </div>
                {isDeleteMode && (
                  <div onClick={() => handleDeleteOption(q.id, opt.id)} className={`absolute -inset-1 bg-red-500 bg-opacity-50 flex items-center justify-center cursor-pointer ${shapeClass} group`}>
                    <TrashIcon className="h-5 w-5 text-white opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all"/>
                  </div>
                )}
              </div>
            ))}
          </React.Fragment>
        );
      default:
        return null;
    }
  };

  const renderAudioButton = (audioButton: AudioButton) => {
    const isDeleteMode = currentTool === 'DELETE';
    const isMoveMode = currentTool === 'MOVE';
    
    return (
      <div 
        key={audioButton.id} 
        style={{ 
          left: `${audioButton.x}%`, 
          top: `${audioButton.y}%`, 
          position: 'absolute', 
          transform: 'translate(-50%, -50%)',
          cursor: isMoveMode ? 'move' : 'default' 
        }}
      >
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-purple-600 transition-colors">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </div>
          {audioButton.label && (
            <div className="absolute top-full mt-1 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded whitespace-nowrap">
              {audioButton.label}
            </div>
          )}
        </div>
        {isDeleteMode && (
          <div 
            onClick={() => handleDeleteAudioButton(audioButton.id)} 
            className="absolute -inset-2 bg-red-500 bg-opacity-50 flex items-center justify-center cursor-pointer rounded-full group"
          >
            <TrashIcon className="h-5 w-5 text-white opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all"/>
          </div>
        )}
      </div>
    );
  };

  const currentPage = survey.pages?.[currentPageIndex];

  if (isLoading) {
    return <div className="text-center p-8">Loading survey editor...</div>
  }

  return (
    <div className="container mx-auto p-8 flex space-x-8">
      <div className="w-1/3 max-w-sm">
        <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Survey Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Survey Title</label>
                <input
                  type="text"
                  value={survey.title}
                  onChange={e => setSurvey(s => ({ ...s, title: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <hr/>
          <div>
            <h2 className="text-xl font-bold mb-4">Audio Files</h2>
            {survey.audioFiles && survey.audioFiles.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                {survey.audioFiles.map((audioFile, index) => (
                  <div key={audioFile.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center mr-2 flex-shrink-0 text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {audioFile.name}
                      </span>
                      {audioFile.duration && (
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          ({Math.floor(audioFile.duration / 60)}:{(audioFile.duration % 60).toFixed(0).padStart(2, '0')})
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => deleteAudioFile(audioFile.id)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No audio files uploaded</p>
            )}
            
            <div className="mt-4">
              <label htmlFor="audio-files-upload" className="w-full text-center cursor-pointer px-4 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 block">
                Upload Audio Files
              </label>
              <input
                id="audio-files-upload"
                type="file"
                accept="audio/*"
                multiple
                onChange={handleAudioFilesUpload}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Support multiple files: MP3, WAV, M4A (Max: 10MB each)
              </p>
            </div>
          </div>
          <hr/>
          <div>
            <h2 className="text-xl font-bold mb-4">Pages</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {survey.pages?.map((page, index) => (
                    <div key={page.id} onClick={() => setCurrentPageIndex(index)} className={`p-2 rounded-md flex items-center justify-between cursor-pointer transition-colors ${currentPageIndex === index ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200'}`}>
                        <div className="flex items-center overflow-hidden">
                            <img src={page.backgroundImage} alt={`Page ${index + 1}`} className="w-16 h-12 object-cover rounded-md mr-3 flex-shrink-0 border-2 border-white" />
                            <span className="font-semibold truncate">Page {index + 1}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deletePage(index); }} className={`p-1 rounded-full ml-2 flex-shrink-0 ${currentPageIndex === index ? 'hover:bg-red-200 text-white' : 'text-slate-500 hover:bg-red-500 hover:text-white'}`}>
                            <TrashIcon />
                        </button>
                    </div>
                ))}
            </div>
             <div className="mt-4">
                <label htmlFor="image-upload" className="w-full text-center cursor-pointer px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-md hover:bg-slate-300 block">
                    Add Page(s)
                </label>
                <input id="image-upload" type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden"/>
            </div>
          </div>
          <hr/>
          <div>
            <h2 className="text-xl font-bold mb-4">Audio Buttons</h2>
            {currentPage && currentPage.audioButtons && currentPage.audioButtons.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {currentPage.audioButtons.map((audioButton, index) => {
                  const audioFile = survey.audioFiles?.find(af => af.id === audioButton.audioFileId);
                  const audioFileIndex = survey.audioFiles?.findIndex(af => af.id === audioButton.audioFileId) ?? -1;
                  
                  return (
                    <div key={audioButton.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center mr-2 flex-shrink-0 text-white text-xs font-bold">
                          {audioFileIndex >= 0 ? audioFileIndex + 1 : '?'}
                        </div>
                        <span className="text-sm font-medium truncate">
                          {audioFile?.name || 'Unknown Audio'}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDeleteAudioButton(audioButton.id)}
                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No audio buttons on this page</p>
            )}
            
            <div className="mt-4">
              {survey.audioFiles && survey.audioFiles.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Select audio to place:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {survey.audioFiles.map((audioFile, index) => (
                      <button
                        key={audioFile.id}
                        onClick={() => handleSelectAudioFile(audioFile.id)}
                        className="w-full flex items-center p-2 bg-white border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                      >
                        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center mr-2 flex-shrink-0 text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-sm truncate">{audioFile.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500 mb-2">Upload audio files first</p>
                  <p className="text-xs text-gray-400">Then select and place them on the image</p>
                </div>
              )}
            </div>
          </div>
          <hr/>
          <div>
            <h2 className="text-xl font-bold mb-4">Toolbox</h2>
              {isEditingQuestion ? (
                  <div>
                      <p className="text-sm text-slate-600 mb-2">Click on the image to add more options.</p>
                      <button onClick={finishEditingQuestion} className="w-full flex justify-center items-center px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600">
                          Finish Question
                      </button>
                  </div>
              ) : (
                  <div className="space-y-2">
                      <ToolButton icon={<TextInputIcon/>} text="Add Short Answer" onClick={() => setCurrentTool(QuestionType.SHORT_ANSWER)} active={currentTool === QuestionType.SHORT_ANSWER}/>
                      <ToolButton icon={<CheckCircleIcon/>} text="Add Single Choice" onClick={() => setCurrentTool(QuestionType.SINGLE_CHOICE)} active={currentTool === QuestionType.SINGLE_CHOICE}/>
                      <ToolButton icon={<ListChecksIcon/>} text="Add Multiple Choice" onClick={() => setCurrentTool(QuestionType.MULTIPLE_CHOICE)} active={currentTool === QuestionType.MULTIPLE_CHOICE}/>
                      <ToolButton icon={<MoveIcon/>} text="Move Tool" onClick={() => setCurrentTool('MOVE')} active={currentTool === 'MOVE'}/>
                      <ToolButton icon={<TrashIcon/>} text="Delete Tool" onClick={() => setCurrentTool('DELETE')} active={currentTool === 'DELETE'} isDelete/>
                  </div>
              )}
          </div>
           <hr/>
           <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400"
           >
            {isSaving ? 'Saving...' : 'Save Survey'}
           </button>
        </div>
      </div>
      <div className="w-2/3">
        <div className="bg-white p-4 rounded-lg shadow-lg sticky top-8">
            <div 
              ref={imageContainerRef} 
              onMouseLeave={() => setDraggingItem(null)} // Stop dragging if mouse leaves canvas
              className="relative select-none" 
              style={{ cursor: getCursor() }}
            >
                {currentPage?.backgroundImage ? (
                    <img src={currentPage.backgroundImage} alt="Survey background" className="w-full h-auto rounded-md pointer-events-none" />
                ) : (
                    <div className="w-full h-[600px] bg-slate-200 rounded-md flex items-center justify-center text-slate-500">
                        {survey.pages && survey.pages.length > 0 ? "Select a page to edit from the left." : "Upload image(s) to create pages and begin."}
                    </div>
                )}
                <div 
                  className="absolute inset-0"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                >
                    {currentPage?.questions?.map(renderQuestion)}
                    {currentPage?.audioButtons?.map(renderAudioButton)}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

interface ToolButtonProps {
    icon: React.ReactNode;
    text: string;
    onClick: () => void;
    active: boolean;
    isDelete?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, text, onClick, active, isDelete = false }) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center px-4 py-2 text-left font-semibold rounded-lg transition-colors ${
            active 
                ? (isDelete ? 'bg-red-500 text-white' : 'bg-blue-500 text-white')
                : 'bg-slate-100 hover:bg-slate-200'
        }`}
    >
        {icon}
        {text}
    </button>
);


export default SurveyEditor;

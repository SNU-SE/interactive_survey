import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSurveys } from '../context/SurveyContext';
import { Survey, Question, QuestionType, ChoiceOption, ShortAnswerQuestion, ChoiceQuestion, SurveyPage } from '../types';
import { CheckCircleIcon, ListChecksIcon, TextInputIcon, TrashIcon, MoveIcon } from '../components/icons';

type Tool = QuestionType | 'DELETE' | 'MOVE' | 'NONE';

interface DraggingItem {
  questionId: string;
  optionId?: string;
  startX: number; // Percentage offset within the element
  startY: number; // Percentage offset within the element
}

const SurveyEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSurvey, addSurvey, updateSurvey } = useSurveys();

  const [survey, setSurvey] = useState<Partial<Survey>>({ title: '', pages: [] });
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentTool, setCurrentTool] = useState<Tool>('NONE');
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [draggingItem, setDraggingItem] = useState<DraggingItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSurvey = async () => {
      if (id && id !== 'new') {
        setIsLoading(true);
        const existingSurvey = await getSurvey(id);
        if (existingSurvey) {
          setSurvey(existingSurvey);
        }
        setIsLoading(false);
      } else {
          setSurvey({ title: '', pages: [] });
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
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
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

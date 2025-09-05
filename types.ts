export enum QuestionType {
  SHORT_ANSWER = 'SHORT_ANSWER',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
}

export interface ChoiceOption {
  id: string;
  x: number; // position as percentage
  y: number; // position as percentage
}

export interface ShortAnswerQuestion {
  id: string;
  type: QuestionType.SHORT_ANSWER;
  x: number; // position as percentage
  y: number; // position as percentage
  width: number; // width as percentage
  height: number; // height as percentage
}

export interface ChoiceQuestion {
  id: string;
  type: QuestionType.MULTIPLE_CHOICE | QuestionType.SINGLE_CHOICE;
  options: ChoiceOption[];
}

export type Question = ShortAnswerQuestion | ChoiceQuestion;

export interface SurveyPage {
  id: string;
  backgroundImage: string; // URL for the image in Firebase Storage
  audioUrl?: string; // URL for the audio file in Firebase Storage
  questions: Question[];
}

export interface Survey {
  id: string;
  title: string;
  pages: SurveyPage[];
  code?: string; // short code like 123-456
  submissionCount?: number;
}

export interface Answer {
  questionId: string;
  value: string | string[];
}

export interface Submission {
    id: string;
    surveyId: string;
    answers: Answer[];
}

import { Types } from "mongoose";

export interface QuizQuestion {
  id: string;
  order: number;
  title: string;
  description: string | null;
  questionType: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  points: number;
  xp: number;
  isAnswered: boolean;
  userAnswer?: string[];
  correctAnswer?: string[];
  isCorrect?: boolean;
  earnedPoints?: number;
  earnedXP?: number;
}

export interface QuizDetails {
  id: string;
  title: string;
  description: string | null;
  totalQuestions: number;
  completedQuestions: number;
  correctAnswers: number;
  progress: number;
  isCompleted: boolean;
  totalPoints: number;
  earnedPoints: number;
  totalXP: number;
  earnedXP: number;
}

export interface QuestionParticipationData {
  taskId: string;
  questId: Types.ObjectId;
  quizParentId: string;
  answers: string[];
  correctAnswers: string[];
  isCorrect: boolean;
  points: number;
  xp: number;
  status: "VALID" | "INVALID" | "PENDING" | "REJECTED";
  airLyftParticipationId: string;
  participatedAt: Date;
  providerId?: string | null;
  taskData?: any;
}

export interface UserResponse {
  status: boolean;
  message: string;
  data: {
    user: {
      lockedUntil: null | string;
      id: string;
      username: string;
      email: string;
      oAuthProvider: null | string;
      oAuthId: null | string;
      roleId: string;
      status: string;
      walletAddress: null | string;
      walletConnected: boolean;
      lastLoginAt: string;
      loginAttempts: number;
      profilePicture: null | string;
      twoFactorEnabled: boolean;
      emailVerified: boolean;
      emailVerificationExpires: null | string;
      passwordResetExpires: null | string;
      createdAt: string;
      updatedAt: string;
      airLyftAuthToken: string;
    };
  };
}

export interface QuizProgress {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  earnedPoints: number;
  earnedXP: number;
  totalPoints: number;
  totalXP: number;
  progress: number;
  isCompleted: boolean;
}

export interface QuestionAnswerResponse {
  questionId: string;
  userAnswers: string[];
  correctAnswers: string[];
  isCorrect: boolean;
  pointsEarned: number;
  xpEarned: number;
  progress: {
    completedQuestions: number;
    totalQuestions: number;
    percentage: number;
    isQuizCompleted: boolean;
  };
  airLyftResponse: any;
  xpResult?: any;
  message: string;
}

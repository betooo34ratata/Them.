export type UserRole = 'student' | 'teacher' | 'director';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  points: number;
  schoolCode?: string;
  teacherSubject?: string;
  createdAt: string;
}

export interface School {
  code: string;
  name: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  schoolCode: string;
  teacherId: string;
  subject: string;
  studentIds: string[];
}

export interface Homework {
  id: string;
  classId: string;
  title: string;
  description: string;
  subject: string;
  dueDate: any;
  teacherId: string;
  createdAt: any;
}

export interface Submission {
  id: string;
  homeworkId: string;
  studentId: string;
  content: string;
  aiFeedback?: string;
  pointsAwarded?: number;
  createdAt: any;
  isCode?: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Quiz {
  id: string;
  classId: string;
  subject: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: any;
}

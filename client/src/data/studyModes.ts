import type { LucideIcon } from 'lucide-react';
import { BookOpen, FastForward, Briefcase, GraduationCap } from 'lucide-react';

export interface StudyModeDef {
  id: string;
  icon: LucideIcon;
  desc: string;
}

export const STUDY_MODES: StudyModeDef[] = [
  { id: 'Beginner', icon: BookOpen, desc: 'Detailed explanations' },
  { id: 'Exam Revision', icon: GraduationCap, desc: 'Focus on formulas' },
  { id: 'Interview Prep', icon: Briefcase, desc: 'Conceptual questions' },
  { id: 'Fast Recap', icon: FastForward, desc: 'High-level summary' },
];

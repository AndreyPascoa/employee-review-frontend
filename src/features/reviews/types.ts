export type Leader = { id: number; name: string };
export type EvaluationSummary = {
  id: number;
  leader_id: number;
  submitted_at: string;
  weighted_score: string;
};
export type Employee = {
  id: number;
  name: string;
  email: string;
  position_name: string;
};
export type TeamMember = Employee & {
  latest_evaluation: Evaluation | null;
  evaluationError: string | null;
};
export type Question = { id: number; title: string; weight: number };
export type Answer = {
  question_id: number;
  title: string;
  weight: number;
  score: number;
};
export type Evaluation = EvaluationSummary & {
  employee_id: number;
  week_start: string;
  answers: Answer[];
};
export type CreatedEvaluation = {
  id: number;
  leader_id: number;
  employee_id: number;
  week_start: string;
  submitted_at: string;
};
export type Score = 1 | 2 | 3 | 4;
export type EvaluationInput = {
  employee_id: number;
  answers: { question_id: number; score: Score }[];
};

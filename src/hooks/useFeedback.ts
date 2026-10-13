import { useState } from 'react';

export function useFeedback() {
  const [feedback, setFeedbackState] = useState({ message: '', error: false });
  const setFeedback = (message: string, error = false) => setFeedbackState({ message, error });
  return [feedback.message, setFeedback, feedback.error] as const;
}

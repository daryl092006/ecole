'use client';
import { useEffect, useState } from 'react';
import { sanitizeSubjectMarkup } from '@/utils/subjectMarkup';

export default function SubjectRichText({ value }: { value: string }) {
  const [markup, setMarkup] = useState('');
  useEffect(() => setMarkup(sanitizeSubjectMarkup(value)), [value]);
  return <div className="subject-rich-content" dangerouslySetInnerHTML={{ __html: markup }} />;
}

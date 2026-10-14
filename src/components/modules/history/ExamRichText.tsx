'use client';
import { createElement, useEffect, useState, type ReactNode } from 'react';
const allowed = new Set(['p','br','strong','b','em','i','u','s','ul','ol','li','blockquote','table','thead','tbody','tr','th','td','sub','sup','h2','h3','h4','pre','code']);
const removed = new Set(['script','style','iframe','object','embed','svg','form','input','button']);
export default function ExamRichText({ value }: { value: unknown }) {
  const source = value == null ? '' : String(value);
  const [content, setContent] = useState<ReactNode>(null);
  useEffect(() => {
    const document = new DOMParser().parseFromString(source, 'text/html');
    const render = (node: Node, key: string): ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (!(node instanceof Element)) return null;
      const tag = node.tagName.toLowerCase();
      if (removed.has(tag)) return null;
      const children = Array.from(node.childNodes).map((child,index) => render(child,`${key}-${index}`));
      if (!allowed.has(tag)) return children;
      return createElement(tag, { key }, tag === 'br' ? undefined : children);
    };
    setContent(Array.from(document.body.childNodes).map((node,index) => render(node,String(index))));
  }, [source]);
  return <div className="exam-rich-text">{content ?? (source.includes('<') ? 'Chargement du texte…' : source)}</div>;
}

import { describe, test, expect } from 'vitest';
import { calculateWordCount, calculateTotalWordCount } from '@/lib/models/manuscript';

describe('Word Count Calculation', () => {
  describe('calculateWordCount', () => {
    test('should count basic words correctly', () => {
      expect(calculateWordCount('Hello world')).toBe(2);
      expect(calculateWordCount('The quick brown fox')).toBe(4);
    });

    test('should handle contractions as single words', () => {
      expect(calculateWordCount("don't")).toBe(1);
      expect(calculateWordCount("it's")).toBe(1);
      expect(calculateWordCount("won't")).toBe(1);
      expect(calculateWordCount("I'm")).toBe(1);
      expect(calculateWordCount("they're")).toBe(1);
      expect(calculateWordCount("She said don't worry it's fine")).toBe(6);
    });

    test('should handle hyphenated words as single words', () => {
      expect(calculateWordCount('mother-in-law')).toBe(1);
      expect(calculateWordCount('twenty-one')).toBe(1);
      expect(calculateWordCount('self-aware')).toBe(1);
      expect(calculateWordCount('The twenty-one year old self-aware student')).toBe(6);
    });

    test('should handle multiple spaces and whitespace', () => {
      expect(calculateWordCount('Hello     world')).toBe(2);
      expect(calculateWordCount('  Hello  world  ')).toBe(2);
      expect(calculateWordCount('Hello\nworld')).toBe(2);
      expect(calculateWordCount('Hello\tworld')).toBe(2);
      expect(calculateWordCount('Hello\r\nworld')).toBe(2);
    });

    test('should handle punctuation correctly', () => {
      expect(calculateWordCount('Hello, world!')).toBe(2);
      expect(calculateWordCount('Hello. World?')).toBe(2);
      expect(calculateWordCount('"Hello," she said.')).toBe(3);
      expect(calculateWordCount('Hello...world')).toBe(2);
    });

    test('should filter out standalone punctuation', () => {
      expect(calculateWordCount('- - -')).toBe(0);
      expect(calculateWordCount("' '")).toBe(0);
      expect(calculateWordCount('Hello - world')).toBe(2);
    });

    test('should handle empty and invalid input', () => {
      expect(calculateWordCount('')).toBe(0);
      expect(calculateWordCount('   ')).toBe(0);
      expect(calculateWordCount('\n\n\n')).toBe(0);
      expect(calculateWordCount(undefined)).toBe(0);
      expect(calculateWordCount(null as unknown as string)).toBe(0);
    });

    test('should handle complex sentences', () => {
      const text = "The self-driving car won't start. It's mother-in-law's fault!";
      expect(calculateWordCount(text)).toBe(8);
    });

    test('should handle numbers', () => {
      expect(calculateWordCount('I have 5 apples')).toBe(4);
      expect(calculateWordCount('The year 2024')).toBe(3);
      expect(calculateWordCount('123 456 789')).toBe(3);
    });
  });

  describe('calculateTotalWordCount', () => {
    test('should sum outline and draft word counts', () => {
      const outline = 'This is the outline';
      const draft = 'This is the draft content';
      expect(calculateTotalWordCount(outline, draft)).toBe(9);
    });

    test('should handle undefined values', () => {
      expect(calculateTotalWordCount('Hello world', undefined)).toBe(2);
      expect(calculateTotalWordCount(undefined, 'Hello world')).toBe(2);
      expect(calculateTotalWordCount(undefined, undefined)).toBe(0);
    });
  });
});

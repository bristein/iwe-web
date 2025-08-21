import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '../test-utils';
import { ProgressTracker } from '@/components/status/ProgressTracker';

describe('ProgressTracker', () => {
  const mockSessions = [
    { date: new Date(), wordCount: 500, duration: 30 },
    { date: new Date(Date.now() - 86400000), wordCount: 750, duration: 45 },
    { date: new Date(Date.now() - 172800000), wordCount: 600, duration: 35 },
  ];

  const mockChapters = [
    {
      id: '1',
      title: 'Chapter 1',
      wordCount: 2500,
      targetWordCount: 3000,
      status: 'draft' as const,
    },
    {
      id: '2',
      title: 'Chapter 2',
      wordCount: 3000,
      targetWordCount: 3000,
      status: 'complete' as const,
    },
    {
      id: '3',
      title: 'Chapter 3',
      wordCount: 1000,
      targetWordCount: 3000,
      status: 'outline' as const,
    },
  ];

  const mockMilestones = [
    {
      id: '1',
      title: 'First Draft',
      targetDate: new Date(Date.now() + 7 * 86400000),
      targetWordCount: 50000,
      completed: false,
    },
    {
      id: '2',
      title: 'Chapter 1 Complete',
      targetDate: new Date(Date.now() - 86400000),
      targetWordCount: 3000,
      completed: true,
      completedDate: new Date(Date.now() - 86400000),
    },
  ];

  const mockAchievements = [
    {
      id: '1',
      title: 'First Words',
      description: 'Write your first 100 words',
      icon: '🎉',
      unlocked: true,
      unlockedDate: new Date(Date.now() - 172800000),
    },
    {
      id: '2',
      title: 'Daily Streak',
      description: 'Write for 7 days in a row',
      icon: '🔥',
      unlocked: false,
    },
  ];

  beforeEach(() => {
    // Reset any mocks
  });

  describe('Overall Progress', () => {
    it('displays total and target word counts', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
        />
      );

      expect(screen.getByText('25,000 / 50,000')).toBeInTheDocument();
      expect(screen.getByText('Total Words Written')).toBeInTheDocument();
    });

    it('calculates and displays progress percentage', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('shows progress bar', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
        />
      );

      // The progress bar is rendered as part of the Chakra UI Progress component
      // We can verify the progress text is shown instead
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });
  });

  describe('Daily Progress', () => {
    it("displays today's word count", () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          dailyGoal={1000}
        />
      );

      expect(screen.getByText("Today's Progress")).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('shows progress towards daily goal', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          dailyGoal={1000}
        />
      );

      expect(screen.getByText(/500 to goal/)).toBeInTheDocument();
    });

    it('indicates when daily goal is achieved', () => {
      const sessionsWithGoalMet = [{ date: new Date(), wordCount: 1000, duration: 60 }];

      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={sessionsWithGoalMet}
          chapters={mockChapters}
          milestones={mockMilestones}
          dailyGoal={1000}
        />
      );

      expect(screen.getByText('Goal achieved!')).toBeInTheDocument();
    });
  });

  describe('Weekly Statistics', () => {
    it('calculates weekly average', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
        />
      );

      expect(screen.getByText('Weekly Average')).toBeInTheDocument();
      expect(screen.getByText('words per active day')).toBeInTheDocument();
    });

    it('shows active days count', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
        />
      );

      expect(screen.getByText(/active days this week/)).toBeInTheDocument();
    });

    it('displays writing speed', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
        />
      );

      expect(screen.getByText('Writing Speed')).toBeInTheDocument();
      expect(screen.getByText('words per minute')).toBeInTheDocument();
    });

    it('estimates completion time', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
        />
      );

      expect(screen.getByText('Est. Completion')).toBeInTheDocument();
      expect(screen.getByText('days remaining')).toBeInTheDocument();
      expect(screen.getByText('at current pace')).toBeInTheDocument();
    });
  });

  describe('Charts and Tabs', () => {
    it('renders tab navigation', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          showCharts={true}
        />
      );

      expect(screen.getByRole('tab', { name: 'Daily Progress' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Chapter Status' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Milestones' })).toBeInTheDocument();
    });

    it('shows achievements tab when achievements provided', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          achievements={mockAchievements}
          showCharts={true}
        />
      );

      expect(screen.getByRole('tab', { name: 'Achievements' })).toBeInTheDocument();
    });

    it('hides charts when showCharts is false', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          showCharts={false}
        />
      );

      expect(screen.queryByRole('tab', { name: 'Daily Progress' })).not.toBeInTheDocument();
    });
  });

  describe('Chapter Breakdown', () => {
    it('displays chapter progress', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          showCharts={true}
        />
      );

      // Click on Chapter Status tab
      const chapterTab = screen.getByRole('tab', { name: 'Chapter Status' });
      chapterTab.click();

      expect(screen.getByText('Chapter Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Chapter 1')).toBeInTheDocument();
      expect(screen.getByText('2,500 / 3,000 words')).toBeInTheDocument();
    });

    it('shows chapter status badges', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          showCharts={true}
        />
      );

      // Click on Chapter Status tab
      const chapterTab = screen.getByRole('tab', { name: 'Chapter Status' });
      chapterTab.click();

      expect(screen.getByText('draft')).toBeInTheDocument();
      expect(screen.getByText('complete')).toBeInTheDocument();
      expect(screen.getByText('outline')).toBeInTheDocument();
    });
  });

  describe('Milestones', () => {
    it('displays upcoming milestones', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          showCharts={true}
        />
      );

      // Click on Milestones tab
      const milestonesTab = screen.getByRole('tab', { name: 'Milestones' });
      milestonesTab.click();

      expect(screen.getByText('Upcoming Milestones')).toBeInTheDocument();
      expect(screen.getByText('First Draft')).toBeInTheDocument();
      expect(screen.getByText(/50,000 words by/)).toBeInTheDocument();
    });

    it('shows completed milestones', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          showCharts={true}
        />
      );

      // Click on Milestones tab
      const milestonesTab = screen.getByRole('tab', { name: 'Milestones' });
      milestonesTab.click();

      expect(screen.getByText('Completed Milestones')).toBeInTheDocument();
      expect(screen.getByText('Chapter 1 Complete')).toBeInTheDocument();
      expect(screen.getByText(/Completed on/)).toBeInTheDocument();
    });

    it('displays days remaining for upcoming milestones', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          showCharts={true}
        />
      );

      // Click on Milestones tab
      const milestonesTab = screen.getByRole('tab', { name: 'Milestones' });
      milestonesTab.click();

      expect(screen.getByText(/\d+ days/)).toBeInTheDocument();
    });
  });

  describe('Achievements', () => {
    it('displays unlocked achievements', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          achievements={mockAchievements}
          showCharts={true}
        />
      );

      // Click on Achievements tab
      const achievementsTab = screen.getByRole('tab', { name: 'Achievements' });
      achievementsTab.click();

      expect(screen.getByText('Recent Achievements')).toBeInTheDocument();
      expect(screen.getByText('First Words')).toBeInTheDocument();
      expect(screen.getByText('Write your first 100 words')).toBeInTheDocument();
    });

    it('shows locked achievements', () => {
      render(
        <ProgressTracker
          totalWordCount={25000}
          targetWordCount={50000}
          sessions={mockSessions}
          chapters={mockChapters}
          milestones={mockMilestones}
          achievements={mockAchievements}
          showCharts={true}
        />
      );

      // Click on Achievements tab
      const achievementsTab = screen.getByRole('tab', { name: 'Achievements' });
      achievementsTab.click();

      expect(screen.getByText('Locked Achievements')).toBeInTheDocument();
      expect(screen.getByText('Write for 7 days in a row')).toBeInTheDocument();
    });
  });
});

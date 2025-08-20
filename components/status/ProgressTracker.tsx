'use client';

import React, { useMemo } from 'react';
import { Box, VStack, HStack, Text, Progress, Badge, Button, Tabs, Stat } from '@chakra-ui/react';
import {
  FiTrendingUp,
  FiTarget,
  FiCalendar,
  FiAward,
  FiClock,
  FiCheckCircle,
  FiEdit2,
  FiBookOpen,
} from 'react-icons/fi';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface WritingSession {
  date: Date;
  wordCount: number;
  duration: number; // in minutes
}

interface ChapterProgress {
  id: string;
  title: string;
  wordCount: number;
  targetWordCount: number;
  status: 'outline' | 'draft' | 'revision' | 'complete';
}

interface Milestone {
  id: string;
  title: string;
  targetDate: Date;
  targetWordCount: number;
  completed: boolean;
  completedDate?: Date;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  unlockedDate?: Date;
}

interface ProgressTrackerProps {
  totalWordCount: number;
  targetWordCount: number;
  sessions: WritingSession[];
  chapters: ChapterProgress[];
  milestones: Milestone[];
  achievements?: Achievement[];
  dailyGoal?: number;
  showCharts?: boolean;
}

const statusColors = {
  outline: '#9CA3AF',
  draft: '#3B82F6',
  revision: '#F59E0B',
  complete: '#10B981',
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  totalWordCount,
  targetWordCount,
  sessions,
  chapters,
  milestones,
  achievements = [],
  dailyGoal = 1000,
  showCharts = true,
}) => {
  const overallProgress = (totalWordCount / targetWordCount) * 100;

  const todayWords = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sessions.filter((s) => s.date >= today).reduce((sum, s) => sum + s.wordCount, 0);
  }, [sessions]);

  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekSessions = sessions.filter((s) => s.date >= weekAgo);

    const totalWords = weekSessions.reduce((sum, s) => sum + s.wordCount, 0);
    const totalMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);
    const activeDays = new Set(weekSessions.map((s) => s.date.toDateString())).size;
    const avgWordsPerDay = activeDays > 0 ? Math.round(totalWords / activeDays) : 0;

    return {
      totalWords,
      totalMinutes,
      activeDays,
      avgWordsPerDay,
    };
  }, [sessions]);

  const dailyData = useMemo(() => {
    const last30Days = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      const endDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const dayWords = sessions
        .filter((s) => s.date >= date && s.date < endDate)
        .reduce((sum, s) => sum + s.wordCount, 0);

      last30Days.push({
        date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        words: dayWords,
        goal: dailyGoal,
      });
    }

    return last30Days;
  }, [sessions, dailyGoal]);

  const chapterStats = useMemo(() => {
    const stats = {
      outline: 0,
      draft: 0,
      revision: 0,
      complete: 0,
    };

    chapters.forEach((chapter) => {
      stats[chapter.status]++;
    });

    return Object.entries(stats).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: statusColors[status as keyof typeof statusColors],
    }));
  }, [chapters]);

  const upcomingMilestones = milestones
    .filter((m) => !m.completed)
    .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
    .slice(0, 3);

  const recentAchievements = achievements
    .filter((a) => a.unlocked)
    .sort((a, b) => (b.unlockedDate?.getTime() || 0) - (a.unlockedDate?.getTime() || 0))
    .slice(0, 4);

  const wordsPerMinute =
    weeklyStats.totalMinutes > 0
      ? Math.round(weeklyStats.totalWords / weeklyStats.totalMinutes)
      : 0;

  const estimatedCompletionDays =
    weeklyStats.avgWordsPerDay > 0
      ? Math.ceil((targetWordCount - totalWordCount) / weeklyStats.avgWordsPerDay)
      : 0;

  return (
    <VStack align="stretch" gap={4}>
      <Box p={4} borderRadius="md" border="1px solid" borderColor="border">
        <HStack justify="space-between" mb={4}>
          <VStack align="start" gap={1}>
            <Text fontSize="2xl" fontWeight="bold">
              {totalWordCount.toLocaleString()} / {targetWordCount.toLocaleString()}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Total Words Written
            </Text>
          </VStack>
          <VStack align="end" gap={1}>
            <Text fontSize="2xl" fontWeight="bold">
              {Math.round(overallProgress)}%
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Complete
            </Text>
          </VStack>
        </HStack>
        <Progress.Root value={overallProgress} size="lg">
          <Progress.Range />
        </Progress.Root>
      </Box>

      <HStack gap={4} align="stretch">
        <Stat.Root flex={1}>
          <Stat.Label>Today&apos;s Progress</Stat.Label>
          <Stat.ValueText>{todayWords.toLocaleString()}</Stat.ValueText>
          <Stat.HelpText>
            {todayWords >= dailyGoal ? (
              <>
                <Stat.UpIndicator />
                Goal achieved!
              </>
            ) : (
              <>
                <Stat.DownIndicator />
                {dailyGoal - todayWords} to goal
              </>
            )}
          </Stat.HelpText>
          <Progress.Root value={(todayWords / dailyGoal) * 100} size="sm" mt={2}>
            <Progress.Range />
          </Progress.Root>
        </Stat.Root>

        <Stat.Root flex={1}>
          <Stat.Label>Weekly Average</Stat.Label>
          <Stat.ValueText>{weeklyStats.avgWordsPerDay.toLocaleString()}</Stat.ValueText>
          <Stat.HelpText>words per active day</Stat.HelpText>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            {weeklyStats.activeDays} active days this week
          </Text>
        </Stat.Root>

        <Stat.Root flex={1}>
          <Stat.Label>Writing Speed</Stat.Label>
          <Stat.ValueText>{wordsPerMinute}</Stat.ValueText>
          <Stat.HelpText>words per minute</Stat.HelpText>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            {Math.round(weeklyStats.totalMinutes / 60)} hours this week
          </Text>
        </Stat.Root>

        <Stat.Root flex={1}>
          <Stat.Label>Est. Completion</Stat.Label>
          <Stat.ValueText>{estimatedCompletionDays}</Stat.ValueText>
          <Stat.HelpText>days remaining</Stat.HelpText>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            at current pace
          </Text>
        </Stat.Root>
      </HStack>

      {showCharts && (
        <Tabs.Root defaultValue="daily">
          <Tabs.List>
            <Tabs.Trigger value="daily">Daily Progress</Tabs.Trigger>
            <Tabs.Trigger value="chapters">Chapter Status</Tabs.Trigger>
            <Tabs.Trigger value="milestones">Milestones</Tabs.Trigger>
            {achievements.length > 0 && (
              <Tabs.Trigger value="achievements">Achievements</Tabs.Trigger>
            )}
          </Tabs.List>

          <Tabs.ContentGroup>
            <Tabs.Content value="daily">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="words" stroke="#3B82F6" name="Words Written" />
                  <Line
                    type="monotone"
                    dataKey="goal"
                    stroke="#9CA3AF"
                    strokeDasharray="5 5"
                    name="Daily Goal"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Tabs.Content>

            <Tabs.Content value="chapters">
              <HStack gap={8}>
                <ResponsiveContainer width="50%" height={300}>
                  <PieChart>
                    <Pie
                      data={chapterStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chapterStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <VStack align="stretch" flex={1} gap={2}>
                  <Text fontWeight="medium">Chapter Breakdown</Text>
                  {chapters.slice(0, 5).map((chapter) => (
                    <Box key={chapter.id}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm" lineClamp={1}>
                          {chapter.title}
                        </Text>
                        <Badge
                          size="sm"
                          colorPalette={
                            chapter.status === 'complete'
                              ? 'green'
                              : chapter.status === 'revision'
                                ? 'yellow'
                                : chapter.status === 'draft'
                                  ? 'blue'
                                  : 'gray'
                          }
                        >
                          {chapter.status}
                        </Badge>
                      </HStack>
                      <Progress.Root
                        value={(chapter.wordCount / chapter.targetWordCount) * 100}
                        size="sm"
                      >
                        <Progress.Range />
                      </Progress.Root>
                      <Text fontSize="xs" color="fg.muted" mt={1}>
                        {chapter.wordCount.toLocaleString()} /{' '}
                        {chapter.targetWordCount.toLocaleString()} words
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </HStack>
            </Tabs.Content>

            <Tabs.Content value="milestones">
              <VStack align="stretch" gap={3}>
                <Text fontWeight="medium">Upcoming Milestones</Text>
                {upcomingMilestones.map((milestone) => (
                  <HStack
                    key={milestone.id}
                    p={3}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="border"
                  >
                    <FiTarget />
                    <VStack align="start" flex={1} gap={0}>
                      <Text fontWeight="medium">{milestone.title}</Text>
                      <Text fontSize="sm" color="fg.muted">
                        {milestone.targetWordCount.toLocaleString()} words by{' '}
                        {milestone.targetDate.toLocaleDateString()}
                      </Text>
                    </VStack>
                    <Badge colorPalette="blue">
                      {Math.ceil(
                        (milestone.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      )}{' '}
                      days
                    </Badge>
                  </HStack>
                ))}

                <Text fontWeight="medium" mt={4}>
                  Completed Milestones
                </Text>
                {milestones
                  .filter((m) => m.completed)
                  .slice(0, 3)
                  .map((milestone) => (
                    <HStack key={milestone.id} p={3} borderRadius="md" bg="bg.muted">
                      <FiCheckCircle color="green" />
                      <VStack align="start" flex={1} gap={0}>
                        <Text fontWeight="medium">{milestone.title}</Text>
                        <Text fontSize="sm" color="fg.muted">
                          Completed on {milestone.completedDate?.toLocaleDateString()}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
              </VStack>
            </Tabs.Content>

            {achievements.length > 0 && (
              <Tabs.Content value="achievements">
                <VStack align="stretch" gap={3}>
                  <Text fontWeight="medium">Recent Achievements</Text>
                  <HStack gap={3} flexWrap="wrap">
                    {recentAchievements.map((achievement) => (
                      <VStack
                        key={achievement.id}
                        p={3}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="border"
                        bg="bg.subtle"
                        width="200px"
                      >
                        <Box fontSize="2xl">{achievement.icon}</Box>
                        <Text fontWeight="medium" textAlign="center">
                          {achievement.title}
                        </Text>
                        <Text fontSize="xs" color="fg.muted" textAlign="center">
                          {achievement.description}
                        </Text>
                        <Badge size="sm" colorPalette="green">
                          {achievement.unlockedDate?.toLocaleDateString()}
                        </Badge>
                      </VStack>
                    ))}
                  </HStack>

                  <Text fontWeight="medium" mt={4}>
                    Locked Achievements
                  </Text>
                  <HStack gap={3} flexWrap="wrap">
                    {achievements
                      .filter((a) => !a.unlocked)
                      .slice(0, 4)
                      .map((achievement) => (
                        <VStack
                          key={achievement.id}
                          p={3}
                          borderRadius="md"
                          border="1px dashed"
                          borderColor="border"
                          opacity={0.5}
                          width="200px"
                        >
                          <Box fontSize="2xl">{achievement.icon}</Box>
                          <Text fontWeight="medium" textAlign="center">
                            ???
                          </Text>
                          <Text fontSize="xs" color="fg.muted" textAlign="center">
                            {achievement.description}
                          </Text>
                        </VStack>
                      ))}
                  </HStack>
                </VStack>
              </Tabs.Content>
            )}
          </Tabs.ContentGroup>
        </Tabs.Root>
      )}
    </VStack>
  );
};

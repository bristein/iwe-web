'use client';

import React, { useState, useCallback, useMemo, useTransition } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  IconButton,
  Badge,
  Table,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiFilter,
  FiDownload,
  FiEdit2,
  FiSave,
  FiX,
  FiCheck,
  FiMinus,
  FiAlertCircle,
  FiUser,
  FiFileText,
} from 'react-icons/fi';

type KnowledgeStatus = 'knows' | 'partial' | 'unknown';

interface CharacterKnowledge {
  characterId: string;
  characterName: string;
  documentId: string;
  documentTitle: string;
  status: KnowledgeStatus;
  inheritedFrom?: string;
  notes?: string;
}

interface KnowledgeRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
}

interface KnowledgeTrackingPanelProps {
  knowledge: CharacterKnowledge[];
  characters: Array<{ id: string; name: string }>;
  documents: Array<{ id: string; title: string; category?: string }>;
  rules?: KnowledgeRule[];
  onUpdateKnowledge?: (characterId: string, documentId: string, status: KnowledgeStatus) => void;
  onBulkUpdate?: (
    updates: Array<{ characterId: string; documentId: string; status: KnowledgeStatus }>
  ) => void;
  onExport?: (format: 'csv' | 'json') => void;
  onApplyRule?: (ruleId: string) => void;
  editable?: boolean;
}

const statusIcons: Record<KnowledgeStatus, React.ReactNode> = {
  knows: <FiCheck />,
  partial: <FiMinus />,
  unknown: <FiX />,
};

const statusColors: Record<KnowledgeStatus, string> = {
  knows: 'green',
  partial: 'yellow',
  unknown: 'gray',
};

export const KnowledgeTrackingPanel: React.FC<KnowledgeTrackingPanelProps> = ({
  knowledge,
  characters,
  documents,
  rules = [],
  onUpdateKnowledge,
  onBulkUpdate,
  onExport,
  onApplyRule,
  editable = true,
}) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [filterCharacter, setFilterCharacter] = useState<string>('');
  const [filterDocument, setFilterDocument] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, KnowledgeStatus>>(new Map());
  const [isPending, startTransition] = useTransition();

  const getKnowledgeKey = (characterId: string, documentId: string) =>
    `${characterId}-${documentId}`;

  const getKnowledgeStatus = useCallback(
    (characterId: string, documentId: string): KnowledgeStatus => {
      const key = getKnowledgeKey(characterId, documentId);
      if (pendingUpdates.has(key)) {
        return pendingUpdates.get(key)!;
      }
      const item = knowledge.find(
        (k) => k.characterId === characterId && k.documentId === documentId
      );
      return item?.status || 'unknown';
    },
    [knowledge, pendingUpdates]
  );

  const filteredCharacters = useMemo(() => {
    if (!filterCharacter && !searchTerm) return characters;

    const searchLower = searchTerm.toLowerCase();
    return characters.filter((c) => {
      if (filterCharacter && c.id !== filterCharacter) return false;
      if (searchTerm && !c.name.toLowerCase().includes(searchLower)) return false;
      return true;
    });
  }, [characters, filterCharacter, searchTerm]);

  const filteredDocuments = useMemo(() => {
    if (!filterDocument && !searchTerm) return documents;

    const searchLower = searchTerm.toLowerCase();
    return documents.filter((d) => {
      if (filterDocument && d.id !== filterDocument) return false;
      if (searchTerm && !d.title.toLowerCase().includes(searchLower)) return false;
      return true;
    });
  }, [documents, filterDocument, searchTerm]);

  const handleStatusChange = useCallback(
    (characterId: string, documentId: string, status: KnowledgeStatus) => {
      if (isEditMode) {
        const key = getKnowledgeKey(characterId, documentId);
        const newUpdates = new Map(pendingUpdates);
        const currentStatus = getKnowledgeStatus(characterId, documentId);

        if (status === currentStatus) {
          newUpdates.delete(key);
        } else {
          newUpdates.set(key, status);
        }
        setPendingUpdates(newUpdates);
      } else if (onUpdateKnowledge) {
        onUpdateKnowledge(characterId, documentId, status);
      }
    },
    [isEditMode, pendingUpdates, getKnowledgeStatus, onUpdateKnowledge]
  );

  const cycleStatus = (currentStatus: KnowledgeStatus): KnowledgeStatus => {
    switch (currentStatus) {
      case 'unknown':
        return 'partial';
      case 'partial':
        return 'knows';
      case 'knows':
        return 'unknown';
    }
  };

  const handleSaveBulkUpdates = useCallback(() => {
    if (onBulkUpdate && pendingUpdates.size > 0) {
      const updates = Array.from(pendingUpdates.entries()).map(([key, status]) => {
        const [characterId, documentId] = key.split('-');
        return { characterId, documentId, status };
      });
      onBulkUpdate(updates);
      setPendingUpdates(new Map());
      setIsEditMode(false);
    }
  }, [pendingUpdates, onBulkUpdate]);

  const handleCancelEdit = useCallback(() => {
    setPendingUpdates(new Map());
    setIsEditMode(false);
  }, []);

  const knowledgeStats = useMemo(() => {
    const total = filteredCharacters.length * filteredDocuments.length;
    let knows = 0,
      partial = 0,
      unknown = 0;

    filteredCharacters.forEach((char) => {
      filteredDocuments.forEach((doc) => {
        const status = getKnowledgeStatus(char.id, doc.id);
        switch (status) {
          case 'knows':
            knows++;
            break;
          case 'partial':
            partial++;
            break;
          case 'unknown':
            unknown++;
            break;
        }
      });
    });

    return { total, knows, partial, unknown };
  }, [filteredCharacters, filteredDocuments, getKnowledgeStatus]);

  const MatrixView = () => (
    <Box overflowX="auto">
      <Table.Root size="sm" variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Character / Document</Table.ColumnHeader>
            {filteredDocuments.map((doc) => (
              <Table.ColumnHeader key={doc.id}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Text fontSize="xs" lineClamp={1} maxWidth="100px">
                      {doc.title}
                    </Text>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content>{doc.title}</Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {filteredCharacters.map((char) => (
            <Table.Row key={char.id}>
              <Table.Cell>
                <Text fontWeight="medium" fontSize="sm">
                  {char.name}
                </Text>
              </Table.Cell>
              {filteredDocuments.map((doc) => {
                const status = getKnowledgeStatus(char.id, doc.id);
                const isUpdated = pendingUpdates.has(getKnowledgeKey(char.id, doc.id));

                return (
                  <Table.Cell key={doc.id}>
                    <IconButton
                      size="xs"
                      variant={isUpdated ? 'solid' : 'ghost'}
                      colorPalette={statusColors[status]}
                      aria-label={`${char.name} - ${doc.title}: ${status}`}
                      onClick={() =>
                        editable && handleStatusChange(char.id, doc.id, cycleStatus(status))
                      }
                      disabled={!editable && !isEditMode}
                    >
                      {statusIcons[status]}
                    </IconButton>
                  </Table.Cell>
                );
              })}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );

  const ListView = () => (
    <VStack align="stretch" gap={2}>
      {knowledge
        .filter((k) => {
          const charMatch = !filterCharacter || k.characterId === filterCharacter;
          const docMatch = !filterDocument || k.documentId === filterDocument;
          const searchMatch =
            !searchTerm ||
            k.characterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            k.documentTitle.toLowerCase().includes(searchTerm.toLowerCase());
          return charMatch && docMatch && searchMatch;
        })
        .map((item, index) => (
          <HStack
            key={index}
            p={2}
            borderRadius="md"
            border="1px solid"
            borderColor="border"
            justify="space-between"
          >
            <HStack flex={1}>
              <FiUser />
              <Text fontSize="sm">{item.characterName}</Text>
            </HStack>
            <HStack flex={1}>
              <FiFileText />
              <Text fontSize="sm">{item.documentTitle}</Text>
            </HStack>
            <HStack>
              <Badge colorPalette={statusColors[item.status]}>
                {statusIcons[item.status]}
                {item.status}
              </Badge>
              {item.inheritedFrom && (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Box color="fg.muted">
                      <FiAlertCircle />
                    </Box>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content>Inherited from {item.inheritedFrom}</Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              )}
            </HStack>
            {editable && (
              <select
                value={item.status}
                onChange={(e) =>
                  onUpdateKnowledge?.(
                    item.characterId,
                    item.documentId,
                    e.target.value as KnowledgeStatus
                  )
                }
                style={{
                  width: '120px',
                  padding: '4px',
                  borderRadius: '4px',
                  border: '1px solid var(--chakra-colors-border)',
                  background: 'var(--chakra-colors-bg)',
                }}
              >
                <option value="knows">Knows</option>
                <option value="partial">Partial</option>
                <option value="unknown">Unknown</option>
              </select>
            )}
          </HStack>
        ))}
    </VStack>
  );

  return (
    <VStack align="stretch" gap={4}>
      <HStack justify="space-between">
        <HStack>
          <Button
            size="sm"
            variant={viewMode === 'matrix' ? 'solid' : 'ghost'}
            onClick={() => setViewMode('matrix')}
          >
            Matrix View
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'solid' : 'ghost'}
            onClick={() => setViewMode('list')}
          >
            List View
          </Button>
        </HStack>

        <HStack>
          {editable && (
            <>
              {isEditMode ? (
                <>
                  <Button
                    size="sm"
                    colorPalette="green"
                    onClick={handleSaveBulkUpdates}
                    disabled={pendingUpdates.size === 0}
                  >
                    <FiSave />
                    Save ({pendingUpdates.size})
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    <FiX />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditMode(true)}>
                  <FiEdit2 />
                  Bulk Edit
                </Button>
              )}
            </>
          )}
          {onExport && (
            <Button size="sm" variant="ghost" onClick={() => onExport('csv')}>
              <FiDownload />
              Export
            </Button>
          )}
        </HStack>
      </HStack>

      <HStack gap={2}>
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => startTransition(() => setSearchTerm(e.target.value))}
          size="sm"
          flex={1}
          disabled={isPending}
        />
        <select
          value={filterCharacter}
          onChange={(e) => setFilterCharacter(e.target.value)}
          style={{
            width: '200px',
            padding: '4px',
            borderRadius: '4px',
            border: '1px solid var(--chakra-colors-border)',
            background: 'var(--chakra-colors-bg)',
          }}
        >
          <option value="">All characters</option>
          {characters.map((char) => (
            <option key={char.id} value={char.id}>
              {char.name}
            </option>
          ))}
        </select>
        <select
          value={filterDocument}
          onChange={(e) => setFilterDocument(e.target.value)}
          style={{
            width: '200px',
            padding: '4px',
            borderRadius: '4px',
            border: '1px solid var(--chakra-colors-border)',
            background: 'var(--chakra-colors-bg)',
          }}
        >
          <option value="">All documents</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
      </HStack>

      <HStack justify="space-between" p={2} bg="bg.muted" borderRadius="md">
        <Text fontSize="sm" color="fg.muted">
          Total: {knowledgeStats.total} relationships
        </Text>
        <HStack gap={3}>
          <HStack>
            <Box color="green.500">{statusIcons.knows}</Box>
            <Text fontSize="sm">{knowledgeStats.knows}</Text>
          </HStack>
          <HStack>
            <Box color="yellow.500">{statusIcons.partial}</Box>
            <Text fontSize="sm">{knowledgeStats.partial}</Text>
          </HStack>
          <HStack>
            <Box color="gray.500">{statusIcons.unknown}</Box>
            <Text fontSize="sm">{knowledgeStats.unknown}</Text>
          </HStack>
        </HStack>
      </HStack>

      {rules.length > 0 && (
        <Box p={2} borderRadius="md" border="1px solid" borderColor="border">
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Knowledge Rules
          </Text>
          <VStack align="stretch" gap={1}>
            {rules.map((rule) => (
              <HStack key={rule.id} justify="space-between">
                <VStack align="start" gap={0}>
                  <Text fontSize="sm">{rule.name}</Text>
                  <Text fontSize="xs" color="fg.muted">
                    {rule.description}
                  </Text>
                </VStack>
                {onApplyRule && (
                  <Button size="xs" variant="ghost" onClick={() => onApplyRule(rule.id)}>
                    Apply
                  </Button>
                )}
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      <Box flex={1} overflowY="auto">
        {viewMode === 'matrix' ? <MatrixView /> : <ListView />}
      </Box>
    </VStack>
  );
};

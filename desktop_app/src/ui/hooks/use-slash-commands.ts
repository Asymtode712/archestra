import { UIMessage } from 'ai';
import { useCallback, useState } from 'react';

import config from '@ui/config';
import { deleteChatMessage } from '@ui/lib/clients/archestra/api/gen';

import { getSlashCommandSuggestions, parseSlashCommand, SlashCommand } from '@ui/lib/utils/slash-commands';

interface UseSlashCommandsProps {
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  sendMessage: (message: { text: string }) => void;
  currentChat?: { id: number } | null;
  clearDraftMessage: (chatId: number) => void;
  updateMessages: (chatId: number, messages: UIMessage[]) => void;
  setIsSubmitting?: (b: boolean) => void;
}

export function useSlashCommands({
  messages,
  setMessages,
  sendMessage,
  currentChat,
  clearDraftMessage,
  updateMessages,
  setIsSubmitting,
}: UseSlashCommandsProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [inputRect, setInputRect] = useState<DOMRect | undefined>();
  const handleClearChat = useCallback(async () => {
    if (!currentChat) return;

    const systemMemoriesId = config.chat.systemMemoriesMessageId;
    const systemMessage = messages.find((m) => m.id === systemMemoriesId) || null;

    const nonSystemMessages = messages.filter((m) => m.id !== systemMemoriesId);
    if (nonSystemMessages.length === 0) {
      console.error('[SlashCommands] /clear ignored: no conversation to clear');
      return;
    }

    const newMessages: UIMessage[] = systemMessage ? [systemMessage] : [];
    setMessages(newMessages);
    updateMessages(currentChat.id, newMessages);
    clearDraftMessage(currentChat.id);

    const messagesToDelete = messages.filter((m) => m.id !== systemMemoriesId);
    for (const msg of messagesToDelete) {
      deleteChatMessage({ path: { id: msg.id } }).catch((err) => {
        console.error('Failed to delete message during /clear:', msg.id, err);
      });
    }
  }, [currentChat, messages, setMessages, clearDraftMessage, updateMessages]);

  const handleCompactChat = useCallback(() => {
    if (!currentChat) return;
    const systemMemoriesId = config.chat.systemMemoriesMessageId;
    const hasConversation = messages.some((m) => m.id !== systemMemoriesId);
    if (!hasConversation) {
      console.error('[SlashCommands] /compact ignored: no conversation to summarize');
      return;
    }
    const conversationText = messages
      .map((msg) => {
        const content = msg.parts?.find((p) => p.type === 'text')?.text || '';
        return `${msg.role}: ${content}`;
      })
      .join('\n');

    const summarizationPrompt = `Summarize the existing conversation above. Provide a concise context summary we can continue from. Do not repeat all messages.\n\n---\n${conversationText}`;
    setIsSubmitting?.(true);
    sendMessage({ text: summarizationPrompt });
    clearDraftMessage(currentChat.id);
  }, [currentChat, messages, sendMessage, clearDraftMessage, setIsSubmitting]);

  const handleSlashCommand = useCallback((command: SlashCommand) => {
    switch (command) {
      case SlashCommand.CLEAR:
        void handleClearChat();
        break;
      case SlashCommand.COMPACT:
        handleCompactChat();
        break;
      default:
        console.warn('Unknown slash command:', command);
    }
  }, [handleClearChat, handleCompactChat]);

  const processInput = useCallback((input: string): boolean => {
    const parseResult = parseSlashCommand(input);
    
    if (parseResult.isSlashCommand && parseResult.isValidCommand && parseResult.command) {
      handleSlashCommand(parseResult.command);
      return true;
    }
    
    return false;
  }, [handleSlashCommand]);

  const updateSuggestions = useCallback((input: string, textareaElement?: HTMLTextAreaElement) => {
    const suggestions = getSlashCommandSuggestions(input);
    
    if (suggestions.length > 0) {
      setShowSuggestions(true);
      setSelectedSuggestionIndex(0);
      
      if (textareaElement) {
        const rect = textareaElement.getBoundingClientRect();
        setInputRect(rect);
      }
    } else {
      setShowSuggestions(false);
    }
    
    return suggestions;
  }, []);

  const selectSuggestion = useCallback((index: number, suggestions: Array<{command: SlashCommand; description: string}>) => {
    if (index >= 0 && index < suggestions.length) {
      return suggestions[index].command;
    }
    return null;
  }, []);

  const navigateSuggestions = useCallback((direction: 'up' | 'down', maxIndex: number) => {
    setSelectedSuggestionIndex(prev => {
      if (direction === 'down') {
        return prev < maxIndex - 1 ? prev + 1 : 0;
      } else {
        return prev > 0 ? prev - 1 : maxIndex - 1;
      }
    });
  }, []);

  const hideSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setSelectedSuggestionIndex(0);
    setInputRect(undefined);
  }, []);

  const isSlashCommandInput = useCallback((input: string) => {
    const parseResult = parseSlashCommand(input);
    return parseResult.isSlashCommand;
  }, []);

  const isValidSlashCommand = useCallback((input: string) => {
    const parseResult = parseSlashCommand(input);
    return parseResult.isValidCommand;
  }, []);

  return {
    showSuggestions,
    selectedSuggestionIndex,
    inputRect,
    processInput,
    updateSuggestions,
    selectSuggestion,
    navigateSuggestions,
    hideSuggestions,
    isSlashCommandInput,
    isValidSlashCommand,
    handleClearChat,
    handleCompactChat,
  };
}
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';

import { constructToolId, FULLY_QUALIFED_ARCHESTRA_MCP_TOOL_IDS } from '@constants';
import ChatHistory from '@ui/components/Chat/ChatHistory';
import ChatInput from '@ui/components/Chat/ChatInput';
import EmptyChatState from '@ui/components/Chat/EmptyChatState';
import SystemPrompt from '@ui/components/Chat/SystemPrompt';
import config from '@ui/config';
import { useChatAgent } from '@ui/contexts/chat-agent-context';
import { useSlashCommands } from '@ui/hooks/use-slash-commands';
import { getSlashCommandSuggestions, SlashCommand } from '@ui/lib/utils/slash-commands';
import { useChatStore, useToolsStore } from '@ui/stores';

export const Route = createFileRoute('/chat')({
  component: ChatPage,
});

function ChatPage() {
  const { saveDraftMessage, getDraftMessage, clearDraftMessage, selectedModel, updateMessages } = useChatStore();
  const { setOnlyTools } = useToolsStore();
  const {
    messages,
    setMessages,
    sendMessage,
    stop,
    isLoading,
    isSubmitting,
    setIsSubmitting,
    editingMessageId,
    editingContent,
    setEditingContent,
    startEdit,
    cancelEdit,
    saveEdit,
    deleteMessage,
    handleRegenerateMessage,
    regeneratingIndex,
    fullMessagesBackup,
    currentChatSessionId,
    currentChat,
    hasTooManyTools,
  } = useChatAgent();

  // Get current input from draft messages
  const currentInput = currentChat ? getDraftMessage(currentChat.id) : '';

  const [slashCommandSuggestions, setSlashCommandSuggestions] = useState<Array<{command: SlashCommand; description: string}>>([]);
  const [showSlashCommandSuggestions, setShowSlashCommandSuggestions] = useState(false);
  const [selectedSlashCommandIndex, setSelectedSlashCommandIndex] = useState(0);

  const slashCommands = useSlashCommands({
    messages,
    setMessages,
    sendMessage,
    currentChat,
    clearDraftMessage,
    updateMessages,
    setIsSubmitting,
  });



  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (currentChat) {
      saveDraftMessage(currentChat.id, newValue);
    }
  };

  const handleSlashCommand = useCallback((command: string): boolean => {
    return slashCommands.processInput(command);
  }, [slashCommands]);

  const handleInputUpdate = useCallback((input: string, textareaRef?: HTMLTextAreaElement) => {
    const suggestions = getSlashCommandSuggestions(input);
    setSlashCommandSuggestions(suggestions);
    setShowSlashCommandSuggestions(suggestions.length > 0);
    if (suggestions.length > 0) {
      setSelectedSlashCommandIndex(0);
    }
  }, []);

  const handleSlashCommandSelect = useCallback((command: SlashCommand) => {
    if (currentChat) {
      saveDraftMessage(currentChat.id, command);
    }
    setShowSlashCommandSuggestions(false);
    setSlashCommandSuggestions([]);
    setSelectedSlashCommandIndex(0);
  }, [currentChat, saveDraftMessage]);

  const handleHideSlashCommandSuggestions = useCallback(() => {
    setShowSlashCommandSuggestions(false);
    setSlashCommandSuggestions([]);
    setSelectedSlashCommandIndex(0);
  }, []);

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (isSubmittingDisabled) return;

    if (handleSlashCommand(currentInput.trim())) {
      if (currentChat) {
        clearDraftMessage(currentChat.id);
      }
      return;
    }
    
    if (currentInput.trim() && currentChat) {
      let messageText = currentInput;

      if (hasTooManyTools) {
        const { LIST_AVAILABLE_TOOLS, ENABLE_TOOLS, DISABLE_TOOLS } = FULLY_QUALIFED_ARCHESTRA_MCP_TOOL_IDS;

        setOnlyTools([LIST_AVAILABLE_TOOLS, ENABLE_TOOLS, DISABLE_TOOLS]);

        messageText = `You currently have only ${LIST_AVAILABLE_TOOLS}, ${ENABLE_TOOLS}, ${DISABLE_TOOLS} enabled. Follow these steps:\n1. Call ${LIST_AVAILABLE_TOOLS} to see all available tool IDs\n2. Call ${ENABLE_TOOLS} with the specific tool IDs you need, for example: {"toolIds": ["${constructToolId('filesystem', 'read_file')}", "${constructToolId('filesystem', 'write_file')}", "${constructToolId('remote-mcp', 'search_repositories')}"}}\n3. After enabling the necessary tools, disable Archestra tools using ${DISABLE_TOOLS}.\n4. After, proceed with this task: \n\n${currentInput}`;
      }

      setIsSubmitting(true);
      sendMessage({ text: messageText });
      clearDraftMessage(currentChat.id);
    }
  };

  const handlePromptSelect = async (prompt: string) => {
    setIsSubmitting(true);
    sendMessage({ text: prompt });
  };

  const handleRerunAgent = async () => {
    const firstUserMessage = messages.find((msg) => msg.role === 'user');
    if (!firstUserMessage) return;

    // Extract text from message.parts for rerun logic
    let messageText = '';
    if (firstUserMessage.parts) {
      const textPart = firstUserMessage.parts.find((part) => part.type === 'text');
      if (textPart && 'text' in textPart) {
        messageText = textPart.text;
      }
    }
    if (!messageText) return;

    // Clear all messages except memories (system message)
    const memoriesMessage = messages.find((msg) => msg.id === config.chat.systemMemoriesMessageId);
    const newMessages = memoriesMessage ? [memoriesMessage] : [];

    // Update messages to only show memories
    setMessages(newMessages);

    // Automatically send the first user message again
    setIsSubmitting(true);
    sendMessage({ text: messageText });
  };

  const isSubmittingDisabled =
    !currentInput.trim() || isLoading || isSubmitting || !selectedModel || selectedModel === '';

  const isChatEmpty = messages.length === 0;

  if (!currentChat) {
    return (
      <div className="flex flex-col h-full gap-2 max-w-full overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <EmptyChatState onPromptSelect={handlePromptSelect} />
        </div>
        <ChatInput
          input=""
          disabled={true}
          rerunAgentDisabled={true}
          isLoading={false}
          isPreparing={false}
          handleInputChange={() => {}}
          handleSubmit={() => {}}
          stop={() => {}}
          hasMessages={false}
          status="ready"
          isSubmitting={false}
        />
      </div>
    );
  }

  const isRegenerating = regeneratingIndex !== null || isLoading;
  const isPreparing = isSubmitting && !isRegenerating;

  return (
    <div className="flex flex-col h-full gap-2 max-w-full overflow-hidden">
      {isChatEmpty ? (
        <div className="flex-1 min-h-0 overflow-auto">
          <EmptyChatState onPromptSelect={handlePromptSelect} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden max-w-full">
          <ChatHistory
            chatId={currentChat.id}
            sessionId={currentChatSessionId}
            messages={regeneratingIndex !== null && fullMessagesBackup.length > 0 ? fullMessagesBackup : messages}
            editingMessageId={editingMessageId}
            editingContent={editingContent}
            onEditStart={startEdit}
            onEditCancel={cancelEdit}
            onEditSave={async (messageId: string) => await saveEdit(messageId)}
            onEditChange={setEditingContent}
            onDeleteMessage={async (messageId: string) => await deleteMessage(messageId)}
            onRegenerateMessage={handleRegenerateMessage}
            isRegenerating={isRegenerating}
            regeneratingIndex={regeneratingIndex}
            isSubmitting={isSubmitting}
          />
        </div>
      )}
      <SystemPrompt />
      <div className="flex-shrink-0">
        <ChatInput
          input={currentInput}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          isPreparing={isPreparing}
          disabled={isSubmittingDisabled}
          stop={stop}
          hasMessages={messages.length > 0}
          onRerunAgent={handleRerunAgent}
          rerunAgentDisabled={isLoading || isSubmitting}
          isSubmitting={isSubmitting}
          onSlashCommand={handleSlashCommand}
          onInputUpdate={handleInputUpdate}
          slashCommandSuggestions={slashCommandSuggestions}
          showSlashCommandSuggestions={showSlashCommandSuggestions}
          selectedSlashCommandIndex={selectedSlashCommandIndex}
          onSlashCommandSelect={handleSlashCommandSelect}
          onHideSlashCommandSuggestions={handleHideSlashCommandSuggestions}
          onSelectedSlashCommandIndexChange={setSelectedSlashCommandIndex}
        />
      </div>
    </div>
  );
}

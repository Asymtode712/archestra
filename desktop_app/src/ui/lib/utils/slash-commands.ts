export interface SlashCommand {
  command: string;
  description: string;
  handler: () => Promise<void> | void;
}

export interface SlashCommandsConfig {
  clear: SlashCommand;
  compact: SlashCommand;
}

export interface SlashCommandParseResult {
  isSlashCommand: boolean;
  command?: string;
  fullCommand?: string;
  isValidCommand: boolean;
}

export const AVAILABLE_SLASH_COMMANDS = {
  clear: {
    command: '/clear',
    description: 'Clear the current chat and start a new conversation',
  },
  compact: {
    command: '/compact',
    description: 'Summarize the conversation and continue with compacted context',
  },
} as const;

export function parseSlashCommand(input: string): SlashCommandParseResult {
  const trimmedInput = input.trim();
  
  if (!trimmedInput.startsWith('/')) {
    return {
      isSlashCommand: false,
      isValidCommand: false,
    };
  }

  const fullCommand = trimmedInput;
  const command = trimmedInput.split(' ')[0]; 
  
  const isValidCommand = Object.values(AVAILABLE_SLASH_COMMANDS).some(
    cmd => cmd.command === command
  );
  
  return {
    isSlashCommand: true,
    command,
    fullCommand,
    isValidCommand,
  };
}

export function getSlashCommandSuggestions(input: string): Array<{command: string; description: string}> {
  const trimmedInput = input.trim().toLowerCase();
  
  if (!trimmedInput.startsWith('/')) {
    return [];
  }
  
  if (trimmedInput === '/') {
    return Object.values(AVAILABLE_SLASH_COMMANDS);
  }
  
  return Object.values(AVAILABLE_SLASH_COMMANDS).filter(cmd => 
    cmd.command.toLowerCase().startsWith(trimmedInput)
  );
}

export function isCompleteSlashCommand(input: string): boolean {
  const trimmed = input.trim();
  return Object.values(AVAILABLE_SLASH_COMMANDS).some(cmd => cmd.command === trimmed);
}
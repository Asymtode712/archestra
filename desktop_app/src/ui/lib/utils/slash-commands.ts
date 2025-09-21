export enum SlashCommand {
  CLEAR = '/clear',
  COMPACT = '/compact',
}

export interface SlashCommandConfig {
  command: SlashCommand;
  description: string;
  handler?: () => Promise<void> | void;
}

export interface SlashCommandsConfig {
  clear: SlashCommandConfig;
  compact: SlashCommandConfig;
}

export interface SlashCommandParseResult {
  isSlashCommand: boolean;
  command?: SlashCommand;
  fullCommand?: string;
  isValidCommand: boolean;
}

export const AVAILABLE_SLASH_COMMANDS = {
  clear: {
    command: SlashCommand.CLEAR,
    description: 'Clear the current chat and start a new conversation',
  },
  compact: {
    command: SlashCommand.COMPACT,
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
  const commandStr = trimmedInput.split(' ')[0]; 
  
  // Check if the command string matches any of our enum values
  const command = Object.values(SlashCommand).find(cmd => cmd === commandStr);
  const isValidCommand = command !== undefined;
  
  return {
    isSlashCommand: true,
    command,
    fullCommand,
    isValidCommand,
  };
}

export function getSlashCommandSuggestions(input: string): Array<{command: SlashCommand; description: string}> {
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
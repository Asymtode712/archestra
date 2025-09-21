import { Command, Hash, Zap } from 'lucide-react';
import React from 'react';

import { SlashCommand } from '@ui/lib/utils/slash-commands';
import { cn } from '@ui/lib/utils/tailwind';

interface SlashCommandSuggestion {
  command: SlashCommand;
  description: string;
}

interface SlashCommandDropdownProps {
  suggestions: SlashCommandSuggestion[];
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  visible: boolean;
  inputRect?: DOMRect;
}

const getCommandIcon = (command: SlashCommand) => {
  switch (command) {
    case SlashCommand.CLEAR:
      return <Hash className="w-4 h-4" />;
    case SlashCommand.COMPACT:
      return <Zap className="w-4 h-4" />;
    default:
      return <Command className="w-4 h-4" />;
  }
};

export function SlashCommandDropdown({
  suggestions,
  selectedIndex,
  onSelect,
  visible,
  inputRect,
}: SlashCommandDropdownProps) {
  if (!visible || suggestions.length === 0) {
    return null;
  }

  const dropdownStyle: React.CSSProperties = inputRect
    ? {
        position: 'fixed',
        top: inputRect.top - 6,
        left: inputRect.left,
        width: Math.max(300, inputRect.width),
        zIndex: 1000,
        transform: 'translateY(-100%)',
        maxHeight: 220,
        overflowY: 'auto',
      }
    : {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        zIndex: 1000,
        maxHeight: 220,
        overflowY: 'auto',
      };

  return (
    <div
      style={dropdownStyle}
      className="bg-popover border border-border rounded-lg shadow-lg p-2 mb-2"
    >
      <div className="text-xs text-muted-foreground mb-2 px-2 font-medium">
        Slash Commands
      </div>
      <div className="space-y-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.command}
            onClick={() => onSelect(suggestion.command)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3',
              'hover:bg-accent hover:text-accent-foreground',
              selectedIndex === index && 'bg-accent text-accent-foreground'
            )}
            type="button"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded bg-muted">
              {getCommandIcon(suggestion.command)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">
                {suggestion.command}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {suggestion.description}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground mt-2 px-2">
        Press Tab or Enter to select • Esc to cancel
      </div>
    </div>
  );
}
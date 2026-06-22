import { useEffect } from 'react';
import { useCircuitStore } from '../store/circuitStore';
import { COMPONENT_REGISTRY, type ToolType } from '../types/circuit';

/** Default keybind mapping */
export interface KeybindMap {
  [key: string]: () => void;
}

/**
 * Global keyboard shortcut hook.
 * Listens for keydown events and dispatches tool/action changes.
 * Ignores shortcuts when input/textarea is focused.
 */
export function useKeyboardShortcuts() {
  const setActiveTool = useCircuitStore(s => s.setActiveTool);
  const toggleLayer = useCircuitStore(s => s.toggleLayer);
  const deleteSelected = useCircuitStore(s => s.deleteSelected);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();

      // Context-aware rotation override
      if (key === 'r') {
        const state = useCircuitStore.getState();
        if (state.selectedNodeId) {
          e.preventDefault();
          state.rotateComponent(state.selectedNodeId);
          return; // Skip tool equip if actively rotating
        }
      }

      // ─── Fixed shortcuts ───
      switch (key) {
        case 'escape':
        case 'h':
          e.preventDefault();
          setActiveTool('select');
          return;
        case 'delete':
        case 'backspace': {
          e.preventDefault();
          const state = useCircuitStore.getState();
          if (state.hoveredCell) {
            const compId = state.findComponentAt(state.hoveredCell.x, state.hoveredCell.y);
            if (compId) {
              state.removeComponent(compId);
              return;
            }
          }
          state.deleteSelected();
          return;
        }
        case 'w':
          e.preventDefault();
          setActiveTool('wire');
          return;

        case 'f':
          e.preventDefault();
          toggleLayer();
          return;
      }

      // ─── Component shortcuts from registry ───
      const match = COMPONENT_REGISTRY.find(c => c.shortcutKey === key);
      if (match) {
        e.preventDefault();
        setActiveTool(match.type as ToolType);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, toggleLayer, deleteSelected]);
}

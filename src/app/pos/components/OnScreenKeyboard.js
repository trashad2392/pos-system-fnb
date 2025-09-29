// src/app/pos/components/OnScreenKeyboard.js
"use client";

import React, { useRef, useEffect } from 'react';
// Corrected import paths for the new version
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

import { Paper } from '@mantine/core';

export default function OnScreenKeyboard({ value, onChange }) {
  const keyboard = useRef();

  useEffect(() => {
    // Sync the keyboard's internal value with the state from the modal
    if (keyboard.current) {
      keyboard.current.setInput(value);
    }
  }, [value]);

  const handleKeyboardChange = (input) => {
    // This function is called by the keyboard library on every change
    onChange(input);
  };

  return (
    <Paper shadow="md" mt="md">
      <Keyboard
        keyboardRef={r => (keyboard.current = r)}
        onChange={handleKeyboardChange}
        layout={{
          default: [
            "q w e r t y u i o p",
            "a s d f g h j k l",
            "{shift} z x c v b n m {bksp}",
            "{space}",
          ],
          shift: [
            "Q W E R T Y U I O P",
            "A S D F G H J K L",
            "{shift} Z X C V B N M {bksp}",
            "{space}",
          ],
        }}
        display={{
          '{bksp}': 'Backspace',
          '{space}': 'Space',
          '{shift}': 'Shift'
        }}
      />
    </Paper>
  );
}
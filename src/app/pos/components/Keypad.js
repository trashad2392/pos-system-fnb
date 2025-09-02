// src/app/pos/components/Keypad.js
"use client";

import { Grid, Button } from '@mantine/core';
import { IconBackspace } from '@tabler/icons-react';

// It now accepts a 'disabled' prop
export default function Keypad({ onNumberPress, onBackspace, onClear, disabled }) {
  const buttons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
  ];

  return (
    <div style={{ padding: '10px' }}>
      {buttons.map((row, rowIndex) => (
        <Grid key={rowIndex} gutter="xs" mb="xs">
          {row.map(number => (
            <Grid.Col span={4} key={number}>
              <Button onClick={() => onNumberPress(number)} size="lg" fullWidth variant="default" disabled={disabled}>
                {number}
              </Button>
            </Grid.Col>
          ))}
        </Grid>
      ))}
      <Grid gutter="xs">
        <Grid.Col span={4}>
          <Button onClick={onClear} size="lg" fullWidth color="red" variant="outline" disabled={disabled}>
            C
          </Button>
        </Grid.Col>
        <Grid.Col span={4}>
          <Button onClick={() => onNumberPress('0')} size="lg" fullWidth variant="default" disabled={disabled}>
            0
          </Button>
        </Grid.Col>
        <Grid.Col span={4}>
          <Button onClick={onBackspace} size="lg" fullWidth variant="light" disabled={disabled}>
            <IconBackspace />
          </Button>
        </Grid.Col>
      </Grid>
    </div>
  );
}
// src/app/pos/components/OrderView.js
"use client";

import { Grid } from '@mantine/core';
import CartPanel from './CartPanel';
import MenuPanel from './MenuPanel';

export default function OrderView(props) {
  return (
    <Grid>
      <Grid.Col span={5}>
        <CartPanel {...props} />
      </Grid.Col>
      <Grid.Col span={7}>
        <MenuPanel {...props} />
      </Grid.Col>
    </Grid>
  );
}
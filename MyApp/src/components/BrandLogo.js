import React from 'react';
import { View, Image } from 'react-native';

// Display original transparent PNGs without their empty margins; no raster edits.
const artwork = {
  horizontal: { image: require('../../assets/brand/oravista-horizontal.png'), x: 200, y: 524, w: 2591, h: 952, sourceW: 3000, sourceH: 2000 },
  stacked: { image: require('../../assets/brand/oravista-stacked.png'), x: 232, y: 98, w: 1534, h: 1675, sourceW: 2000, sourceH: 2000 },
  symbol: { image: require('../../assets/brand/oravista-symbol.png'), x: 0, y: 0, w: 2000, h: 2000, sourceW: 2000, sourceH: 2000 },
};
export default function BrandLogo({ variant = 'horizontal', width = 170, style }) {
  const a = artwork[variant] || artwork.horizontal;
  const scale = width / a.w;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="OraVista" style={[{ width, height: a.h * scale, overflow: 'hidden' }, style]}>
      <Image accessible={false} source={a.image} resizeMode="stretch" style={{ position: 'absolute', width: a.sourceW * scale, height: a.sourceH * scale, left: -a.x * scale, top: -a.y * scale }} />
    </View>
  );
}

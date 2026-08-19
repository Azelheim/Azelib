import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { generateQrMatrix } from './qrcode';

interface QRCodeSvgProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export function QRCodeSvg({
  value,
  size = 180,
  color = '#000000',
  backgroundColor = '#FFFFFF',
  style,
}: QRCodeSvgProps) {
  const matrix = useMemo(() => {
    if (!value || value.trim().length === 0) return [];
    try {
      return generateQrMatrix(value);
    } catch (e) {
      console.error('QR generation error:', e);
      return [];
    }
  }, [value]);

  if (matrix.length === 0) {
    return null;
  }

  const moduleCount = matrix.length;
  // 2 modules padding (quiet zone)
  const quietZone = 2;
  const totalGrid = moduleCount + quietZone * 2;
  const cellSize = size / totalGrid;

  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background */}
        <Rect x={0} y={0} width={size} height={size} fill={backgroundColor} />

        {/* Modules */}
        {matrix.map((row, r) =>
          row.map((isDark, c) => {
            if (!isDark) return null;
            const x = (c + quietZone) * cellSize;
            const y = (r + quietZone) * cellSize;
            return (
              <Rect
                key={`${r}-${c}`}
                x={x}
                y={y}
                width={cellSize + 0.1} // +0.1 to avoid sub-pixel gaps
                height={cellSize + 0.1}
                fill={color}
              />
            );
          })
        )}
      </Svg>
    </View>
  );
}

/**
 * Helper to generate pure inline SVG HTML string for expo-print / sharing
 */
export function getQrSvgHtml(value: string, displaySize: number = 240, color: string = '#000000'): string {
  try {
    const matrix = generateQrMatrix(value);
    if (!matrix || matrix.length === 0) return '';
    const moduleCount = matrix.length;
    const quietZone = 2;
    const totalGrid = moduleCount + quietZone * 2;
    const cellSize = displaySize / totalGrid;

    let rects = '';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (matrix[r][c]) {
          const x = (c + quietZone) * cellSize;
          const y = (r + quietZone) * cellSize;
          rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(cellSize + 0.2).toFixed(2)}" height="${(cellSize + 0.2).toFixed(2)}" fill="${color}" />`;
        }
      }
    }

    return `
      <svg width="${displaySize}" height="${displaySize}" viewBox="0 0 ${displaySize} ${displaySize}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${displaySize}" height="${displaySize}" fill="#FFFFFF" />
        ${rects}
      </svg>
    `;
  } catch (e) {
    console.error('getQrSvgHtml error:', e);
    return '';
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

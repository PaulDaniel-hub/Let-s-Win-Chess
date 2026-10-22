import React from 'react';
import { PieceColor, PieceType } from '../types/chess';

export const ChessPieceSvg: React.FC<{
  type: PieceType;
  color: PieceColor;
  className?: string;
}> = ({ type, color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#ffffff' : '#22252a';
  const stroke = isWhite ? '#1e293b' : '#0f172a';
  const strokeWidth = '1.5';

  switch (type) {
    case 'p':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 C 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {isWhite && (
            <path
              d="M 22.5 10 A 3 3 0 0 1 25.5 13 A 3 3 0 0 1 22.5 16 A 3 3 0 0 1 19.5 13 A 3 3 0 0 1 22.5 10 z"
              fill="#ffffff"
            />
          )}
          {!isWhite && (
            <path
              d="m 22.5,10 c -1.66,0 -3,1.34 -3,3 0,0.67 0.22,1.28 0.59,1.78 C 19.23,15.65 18,17.68 18,20 c 0,1.52 0.7,2.88 1.81,3.77 C 17.03,24.86 13,29.13 13,37 l 19,0 c 0,-7.87 -4.03,-12.14 -6.81,-13.23 C 26.3,22.88 27,21.52 27,20 27,17.68 25.77,15.65 24.91,14.78 25.28,14.28 25.5,13.67 25.5,13 c 0,-1.66 -1.34,-3 -3,-3 z"
              fill="#2e3440"
            />
          )}
        </svg>
      );

    case 'r':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z" />
            <path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z" />
            <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
            <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
            <path d="M 14,17 L 14,29.5 L 31,29.5 L 31,17" />
            <path d="M 14,29.5 L 11,32 L 34,32 L 31,29.5" />
            <path d="M 12,36 L 33,36" />
          </g>
          {isWhite && (
            <path
              d="M 14,17 L 31,17 M 13,31 L 32,31"
              stroke={stroke}
              strokeWidth="1"
            />
          )}
        </svg>
      );

    case 'n':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22,10 c 10.5,1 16.5,8 16,29 L 15,39 C 15,28 9,26 9,19 9,13 14,8 22,10 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m 24,18 c 0.38,2.91 -5.55,7.37 -8,9 -3,2 -2.82,4.34 -5,4 -1.04,-0.94 -1.41,-2.48 -1,-4 0.41,-1.52 1.5,-2.5 3,-3 1.5,-0.5 4,-1 5,-3 1,-2 2,-3 6,-3 z"
            fill={isWhite ? '#f8fafc' : '#334155'}
            stroke={stroke}
            strokeWidth="1"
          />
          <circle cx="27" cy="16" r="1.5" fill={isWhite ? '#0f172a' : '#ffffff'} />
        </svg>
      );

    case 'b':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 9,36 C 12.33,35 15.67,35 19,36 C 21.67,36.5 23.33,36.5 26,36 C 29.33,35 32.67,35 36,36 C 36.5,39 36,41 36,41 L 9,41 C 9,41 8.5,39 9,36 z" />
            <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,28.5 28.5,26 C 27,23.5 27.5,21 27,15 C 26.5,9 22.5,6 22.5,6 C 22.5,6 18.5,9 18,15 C 17.5,21 18,23.5 16.5,26 C 15,28.5 14.5,30.5 15,32 z" />
            <path d="M 25 8 A 2.5 2.5 0 1 1 20 8 A 2.5 2.5 0 1 1 25 8 z" />
          </g>
          <path
            d="M 17.5,26 L 27.5,26 M 15,30 L 30,30"
            stroke={stroke}
            strokeWidth="1"
          />
          <path
            d="M 20,13 L 25,18 M 25,13 L 20,18"
            stroke={isWhite ? '#334155' : '#cbd5e1'}
            strokeWidth="1.2"
          />
        </svg>
      );

    case 'q':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 9,26 c 8.5,-1.5 21,-1.5 27,0 l 2.5,-12.5 L 31,21 l -4,-11 -4.5,11 -4.5,-11 -4,11 -7.5,-7.5 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10,38.5 L 35,38.5 C 34.5,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <circle cx="6" cy="12" r="2" fill={fill} stroke={stroke} strokeWidth="1" />
          <circle cx="14" cy="9" r="2" fill={fill} stroke={stroke} strokeWidth="1" />
          <circle cx="22.5" cy="8" r="2" fill={fill} stroke={stroke} strokeWidth="1" />
          <circle cx="31" cy="9" r="2" fill={fill} stroke={stroke} strokeWidth="1" />
          <circle cx="39" cy="12" r="2" fill={fill} stroke={stroke} strokeWidth="1" />
        </svg>
      );

    case 'k':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="M 22.5,11.63 L 22.5,6 M 20,8 L 25,8"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 11.5,37 C 17,40.5 28,40.5 33.5,37 C 36.5,35 36.5,33 36.5,33 C 36.5,33 34.5,31 32,29.5 C 29.5,28 27.5,27.5 22.5,27.5 C 17.5,27.5 15.5,28 13,29.5 C 10.5,31 8.5,33 8.5,33 C 8.5,33 8.5,35 11.5,37 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d="M 11.5,30 C 15,27 20,26 22.5,26 C 25,26 30,27 33.5,30"
            fill="none"
            stroke={stroke}
            strokeWidth="1.2"
          />
        </svg>
      );

    default:
      return null;
  }
};

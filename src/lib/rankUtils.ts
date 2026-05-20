import { RANKS } from '../constants';

export function getRank(points: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].minPoints) {
      return {
        current: RANKS[i],
        next: RANKS[i + 1] || null,
        progress: RANKS[i + 1] 
          ? ((points - RANKS[i].minPoints) / (RANKS[i + 1].minPoints - RANKS[i].minPoints)) * 100 
          : 100
      };
    }
  }
  return { current: RANKS[0], next: RANKS[1], progress: 0 };
}

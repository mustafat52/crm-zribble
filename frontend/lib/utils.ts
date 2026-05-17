import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function getScoreClass(score: number): string {
  if (score >= 80) return 'score-hot'
  if (score >= 60) return 'score-warm'
  if (score >= 40) return 'score-cold'
  return 'score-new'
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Hot'
  if (score >= 60) return 'Warm'
  if (score >= 40) return 'Cold'
  return 'New'
}

export function getAIAnswer(query: string): string {
  const q = query.toLowerCase()
  if (q.includes('focus') || q.includes('today') || q.includes('priority'))
    return '🎯 Priority today: Sneha Iyer (91 score, demo confirmed), Rohan Gupta (88, hot reply), Ananya Singh (proposal follow-up due). These 3 have the highest close probability this week.'
  if (q.includes('stale') || q.includes('cold') || q.includes('inactive'))
    return '⚠️ 24 leads untouched 7+ days across all clients: PixelForce has 12, DigiFlow has 8, BrandLab has 4. Auto-nudge can handle all of them in one click.'
  if (q.includes('best') || q.includes('top') || q.includes('performing'))
    return '📈 AdSync India leads performance: 31% conversion, ₹12.4Cr pipeline. Key driver: LinkedIn Ads (42% of leads, 38% conversion rate vs 22% industry avg).'
  if (q.includes('pipeline') || q.includes('revenue') || q.includes('value'))
    return '💰 Total pipeline: ₹30.5Cr across 4 clients. 14 deals in proposal stage worth ~₹4.2Cr. 6 deals likely to close this week based on engagement patterns.'
  return '💡 Pipeline health is 73%. 3 deals likely to close this week. AdSync is your star client. PixelForce needs immediate attention — 12 stale leads risk dropping conversion further.'
}
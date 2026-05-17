export const CLIENTS = [
  {
    id: 'adsync',
    initials: 'AS',
    name: 'AdSync India',
    color: '#2d4a10',
    textColor: '#a3e635',
    leads: 287,
    users: 42,
    pipeline: '₹12.4Cr',
    pipelineRaw: 124000000,
    conv: 31,
    convColor: '#4ade80',
    dot: 'green',
    status: 'Best performer',
    industry: 'Digital Marketing',
    manager: 'Arjun Shah',
  },
  {
    id: 'brandlab',
    initials: 'BL',
    name: 'BrandLab Co.',
    color: '#134e4a',
    textColor: '#2dd4bf',
    leads: 194,
    users: 31,
    pipeline: '₹8.1Cr',
    pipelineRaw: 81000000,
    conv: 22,
    convColor: '#fbbf24',
    dot: 'amber',
    status: 'Stable',
    industry: 'Branding & Design',
    manager: 'Meena Krishnan',
  },
  {
    id: 'digiflow',
    initials: 'DF',
    name: 'DigiFlow Agency',
    color: '#78350f',
    textColor: '#fbbf24',
    leads: 156,
    users: 18,
    pipeline: '₹6.8Cr',
    pipelineRaw: 68000000,
    conv: 19,
    convColor: '#fbbf24',
    dot: 'amber',
    status: '18 stale leads',
    industry: 'Performance Marketing',
    manager: 'Ritesh Nair',
  },
  {
    id: 'pixelforce',
    initials: 'PF',
    name: 'PixelForce',
    color: '#7f1d1d',
    textColor: '#f87171',
    leads: 98,
    users: 12,
    pipeline: '₹3.2Cr',
    pipelineRaw: 32000000,
    conv: 14,
    convColor: '#f87171',
    dot: 'red',
    status: 'Conv. dropping',
    industry: 'Social Media Marketing',
    manager: 'Priya Menon',
  },
]

export const LEAD_SOURCES = [
  { name: 'LinkedIn Ads',    val: 2184, color: '#818cf8' },
  { name: 'Google Ads',      val: 1671, color: '#60a5fa' },
  { name: 'Website forms',   val: 1274, color: '#4ade80' },
  { name: 'Referral',        val: 849,  color: '#fbbf24' },
  { name: 'Email campaign',  val: 306,  color: '#6b7280' },
]

export const AI_ALERTS = [
  {
    id: 'nudge',
    icon: 'PF',
    color: '#7f1d1d',
    textColor: '#f87171',
    title: 'PixelForce',
    message: 'has 12 stale leads. Auto-nudge ready.',
    time: '5 min ago',
    urgency: 'high',
    screen: 'nudge',
  },
  {
    id: 'best',
    icon: 'AS',
    color: '#2d4a10',
    textColor: '#a3e635',
    title: 'AdSync India',
    message: 'pipeline up 31%. Best performer.',
    time: '1h ago',
    urgency: 'info',
    screen: 'best',
  },
  {
    id: 'scored',
    icon: 'AI',
    color: '#2e1065',
    textColor: '#a78bfa',
    title: 'AI auto-scored',
    message: '284 new leads overnight.',
    time: '6h ago',
    urgency: 'info',
    screen: 'scored',
  },
]

export const RECENT_ACTIVITY = [
  { color: '#818cf8', text: 'BrandLab — Sneha moved to Qualified',   time: '8 min ago',  client: 'brandlab' },
  { color: '#4ade80', text: 'AdSync — 3 new leads from LinkedIn',     time: '22 min ago', client: 'adsync'   },
  { color: '#fbbf24', text: 'DigiFlow — AI flagged 2 cold leads',     time: '1h ago',     client: 'digiflow' },
  { color: '#60a5fa', text: 'PixelForce — Raj opened proposal email', time: '2h ago',     client: 'pixelforce'},
  { color: '#a3e635', text: 'AdSync — Deal closed: ₹45L',            time: '3h ago',     client: 'adsync'   },
]

export const STAGES = [
  { key: 'new',       label: 'New',       color: '#6b7280' },
  { key: 'contacted', label: 'Contacted', color: '#60a5fa' },
  { key: 'qualified', label: 'Qualified', color: '#a78bfa' },
  { key: 'proposal',  label: 'Proposal',  color: '#fbbf24' },
  { key: 'closed',    label: 'Closed',    color: '#4ade80' },
]

export const LEADS = {
  adsync: {
    new: [
      { id: 'as1', name: 'Priya Sharma',  company: 'Zeta Corp',     score: 82, source: 'LinkedIn',  intent: 'hot',  intentLabel: 'Viewed pricing 3x', stage: 'new',  email: 'priya@zetacorp.in',  value: '₹18L' },
      { id: 'as2', name: 'Arnav Mehta',   company: 'BlueWave Ltd',  score: 71, source: 'Google Ads', stage: 'new',  email: 'arnav@bluewave.co',     value: '₹12L' },
      { id: 'as3', name: 'Kavya Reddy',   company: 'Nexus Tech',    score: 58, source: 'Referral',   stage: 'new',  email: 'kavya@nexustech.io',    value: '₹9L'  },
    ],
    contacted: [
      { id: 'as4', name: 'Rohan Gupta',   company: 'Streamline Inc',score: 88, source: 'LinkedIn',  intent: 'hot', intentLabel: 'Replied within 1hr',stage: 'contacted', email: 'rohan@streamline.com', value: '₹24L' },
      { id: 'as5', name: 'Nisha Patel',   company: 'DataCore',      score: 64, source: 'Website',    stage: 'contacted', email: 'nisha@datacore.in',     value: '₹15L' },
    ],
    qualified: [
      { id: 'as6', name: 'Sneha Iyer',    company: 'TechBridge',    score: 91, source: 'Referral',  intent: 'hot', intentLabel: 'Demo scheduled',    stage: 'qualified', email: 'sneha@techbridge.io',  value: '₹42L' },
      { id: 'as7', name: 'Vikram Das',    company: 'OmniSoft',      score: 73, source: 'LinkedIn',   stage: 'qualified', email: 'vikram@omnisoft.com',   value: '₹20L' },
    ],
    proposal: [
      { id: 'as8', name: 'Ananya Singh',  company: 'FutureWave',    score: 85, source: 'LinkedIn',   stage: 'proposal',  email: 'ananya@futurewave.ai',  value: '₹35L' },
      { id: 'as9', name: 'Deepak Kumar',  company: 'Horizon AI',    score: 79, source: 'Email',       stage: 'proposal',  email: 'deepak@horizonai.in',   value: '₹28L' },
    ],
    closed: [
      { id: 'as10', name: 'Meera Nair',  company: 'VisionTech',    score: 95, source: 'Referral',   stage: 'closed',    email: 'meera@visiontech.com',  value: '₹55L' },
      { id: 'as11', name: 'Suresh Varma',company: 'CloudSync',      score: 88, source: 'LinkedIn',   stage: 'closed',    email: 'suresh@cloudsync.io',   value: '₹38L' },
    ],
  },
  brandlab: {
    new: [
      { id: 'bl1', name: 'Aditi Rao',     company: 'Pixel Dreams',  score: 74, source: 'Google Ads', stage: 'new',      email: 'aditi@pixeldreams.in',  value: '₹14L' },
      { id: 'bl2', name: 'Sanjay Bhat',   company: 'Creative Hub',  score: 61, source: 'Referral',   stage: 'new',      email: 'sanjay@creativehub.com', value: '₹10L' },
    ],
    contacted: [
      { id: 'bl3', name: 'Pooja Menon',   company: 'DesignCo',      score: 80, source: 'LinkedIn',  intent: 'warm', intentLabel: 'Opened 4 emails',  stage: 'contacted', email: 'pooja@designco.in', value: '₹22L' },
    ],
    qualified: [
      { id: 'bl4', name: 'Rahul Sharma',  company: 'BrandFirst',    score: 83, source: 'Referral',   stage: 'qualified', email: 'rahul@brandfirst.com',  value: '₹30L' },
    ],
    proposal: [
      { id: 'bl5', name: 'Neha Kapoor',   company: 'Studio Nine',   score: 77, source: 'Website',    stage: 'proposal',  email: 'neha@studionine.io',    value: '₹25L' },
    ],
    closed: [
      { id: 'bl6', name: 'Aryan Joshi',   company: 'MegaBrand',     score: 92, source: 'Referral',   stage: 'closed',    email: 'aryan@megabrand.com',   value: '₹48L' },
    ],
  },
  digiflow: {
    new: [
      { id: 'df1', name: 'Karan Mehta',   company: 'AdFlow',        score: 45, source: 'Google Ads', stage: 'new', stale: 8,  email: 'karan@adflow.in',       value: '₹8L'  },
      { id: 'df2', name: 'Ritu Singh',    company: 'PerformX',      score: 52, source: 'Facebook',   stage: 'new', stale: 11, email: 'ritu@performx.com',     value: '₹11L' },
    ],
    contacted: [
      { id: 'df3', name: 'Amit Saxena',   company: 'GrowthLabs',    score: 63, source: 'LinkedIn',   stage: 'contacted', stale: 9, email: 'amit@growthlabs.io', value: '₹16L' },
      { id: 'df4', name: 'Divya Nair',    company: 'ConvertPro',    score: 55, source: 'Website',    stage: 'contacted', stale: 14, email: 'divya@convertpro.in', value: '₹13L' },
    ],
    qualified: [
      { id: 'df5', name: 'Rohit Tiwari',  company: 'ScaleUp',       score: 71, source: 'Referral',   stage: 'qualified', email: 'rohit@scaleup.co',      value: '₹20L' },
    ],
    proposal: [
      { id: 'df6', name: 'Sonal Gupta',   company: 'MediaBoost',    score: 68, source: 'Email',      stage: 'proposal',  email: 'sonal@mediaboost.in',   value: '₹19L' },
    ],
    closed: [
      { id: 'df7', name: 'Vivek Sharma',  company: 'DigitalEdge',   score: 87, source: 'Referral',   stage: 'closed',    email: 'vivek@digitaledge.com', value: '₹33L' },
    ],
  },
  pixelforce: {
    new: [
      { id: 'pf1', name: 'Raj Malhotra',  company: 'BrightAds',     score: 34, source: 'Google Ads', stage: 'new', stale: 12, email: 'raj@brightads.in',      value: '₹7L'  },
      { id: 'pf2', name: 'Pooja Sharma',  company: 'MediaFirst',    score: 28, source: 'Facebook',   stage: 'new', stale: 9,  email: 'pooja@mediafirst.com',  value: '₹6L'  },
    ],
    contacted: [
      { id: 'pf3', name: 'Arun Verma',    company: 'ClickFarm',     score: 41, source: 'LinkedIn',   stage: 'contacted', stale: 15, email: 'arun@clickfarm.io', value: '₹9L' },
      { id: 'pf4', name: 'Sanya Gupta',   company: 'AdNexus',       score: 52, source: 'Website',    stage: 'contacted', stale: 8,  email: 'sanya@adnexus.in',  value: '₹12L' },
    ],
    qualified: [
      { id: 'pf5', name: 'Rahul Bose',    company: 'DigitalMind',   score: 67, source: 'Referral',   stage: 'qualified', email: 'rahul@digitalmind.com', value: '₹18L' },
    ],
    proposal: [],
    closed: [
      { id: 'pf6', name: 'Kiran Rao',     company: 'PrimeAds',      score: 88, source: 'Referral',   stage: 'closed',    email: 'kiran@primeads.in',     value: '₹28L' },
    ],
  },
}

export const AI_NUDGES = [
  {
    leadId: 'pf1',
    name: 'Raj Malhotra',
    company: 'BrightAds',
    days: 12,
    message: "Hi Raj, just checking in — happy to schedule a quick 15-min call to answer any questions about how our solution can help BrightAds scale faster this quarter?",
  },
  {
    leadId: 'pf2',
    name: 'Pooja Sharma',
    company: 'MediaFirst',
    days: 9,
    message: "Hi Pooja, wanted to follow up on your inquiry. We just published a case study that's highly relevant to MediaFirst — would love to send it over. Worth a quick look?",
  },
  {
    leadId: 'pf3',
    name: 'Arun Verma',
    company: 'ClickFarm',
    days: 15,
    message: "Hi Arun, it's been a couple of weeks — I know things get busy. Still happy to help ClickFarm improve pipeline velocity. Worth a quick reconnect this week?",
  },
  {
    leadId: 'pf4',
    name: 'Sanya Gupta',
    company: 'AdNexus',
    days: 8,
    message: "Hi Sanya, following up from our last conversation — happy to walk through how AdNexus can use AI lead scoring to cut time-to-close by 30%. Can we connect Friday?",
  },
]

export const EMAIL_DRAFTS = {
  as6: "Hi Sneha, just following up on our demo conversation — I've put together a custom proposal based on TechBridge's goals. Would love to walk you through it this week. When works best for you?",
  as4: "Hi Rohan, great to hear back from you so quickly! I've attached the overview doc as promised. Let me know if you'd like to schedule a full demo — we can have you up and running within a week.",
  as1: "Hi Priya, noticed you visited our pricing page a few times — I'd love to answer any questions and show you how Zeta Corp can see ROI in the first 30 days. Happy to do a quick call?",
  default: (name: string) => `Hi ${name.split(' ')[0]}, wanted to check in and see if you had any questions about what we discussed. Happy to connect at your convenience — just reply to this email.`,
}

export const SCORE_BREAKDOWN = {
  high: [
    { label: 'Email engagement', val: 85, color: '#4ade80' },
    { label: 'Website activity',  val: 92, color: '#60a5fa' },
    { label: 'Response speed',    val: 78, color: '#a78bfa' },
    { label: 'Profile fit',       val: 88, color: '#fbbf24' },
  ],
  low: [
    { label: 'Email engagement', val: 38, color: '#4ade80' },
    { label: 'Website activity',  val: 22, color: '#60a5fa' },
    { label: 'Response speed',    val: 55, color: '#a78bfa' },
    { label: 'Profile fit',       val: 60, color: '#fbbf24' },
  ],
}

export const INTERACTION_HISTORY = [
  { type: 'Email',    text: 'Sent intro email — 68% open rate',    time: '2 days ago' },
  { type: 'LinkedIn', text: 'Connected and messaged on LinkedIn',   time: '4 days ago' },
  { type: 'Web',      text: 'Visited pricing page (3 sessions)',    time: '1 day ago'  },
  { type: 'Call',     text: 'Attempted call — left voicemail',      time: '3 days ago' },
  { type: 'Email',    text: 'Replied: "Interested, send more info"',time: '1 day ago'  },
]

export const AI_ANSWERS = {
  focus:   '🎯 Priority today: Sneha Iyer (91 score, demo confirmed), Rohan Gupta (88, hot reply), Ananya Singh (proposal follow-up due). These 3 have highest close probability this week.',
  stale:   '⚠️ 24 leads untouched 7+ days across all clients: PixelForce has 12, DigiFlow has 8, BrandLab has 4. Auto-nudge can handle all of them in one click.',
  best:    '📈 AdSync India leads performance: 31% conversion, ₹12.4Cr pipeline. Key driver: LinkedIn Ads (42% of leads, 38% conversion rate vs 22% industry avg).',
  pipeline:'💰 Total pipeline: ₹30.5Cr across 4 clients. 14 deals in proposal stage worth ~₹4.2Cr. 6 deals likely to close this week based on engagement patterns.',
  default: '💡 Pipeline health is 73%. 3 deals likely to close this week. AdSync is your star client. PixelForce needs immediate attention — 12 stale leads risk dropping conversion further.',
}

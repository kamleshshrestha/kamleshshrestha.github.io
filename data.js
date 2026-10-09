// All portfolio content that appears in the detail drawer — sourced from the CV.
export const DETAILS = {
  orson: {
    kicker: 'Experience · Planet 03',
    title: 'Data Analyst — Orson Infotech',
    meta: 'Nepal · Jan 2025 – Nov 2025',
    bullets: [
      'Cleaned 50,000+ record datasets in SQL for monthly management reporting.',
      'Built weekly dashboards tracking sales metrics for non-technical stakeholders.',
      'Cleaned and structured raw datasets with Pandas and NumPy, fixing inconsistencies and missing values before analysis.',
      'Extracted and analysed customer data from multiple databases to identify behaviour patterns for campaigns.',
      'Built visualisations in Matplotlib and Seaborn — heatmaps and distribution charts — for executive audiences.',
      'Translated business requirements into data-driven insights, using Python for statistical analysis.',
    ],
    tags: ['SQL', 'Python', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Dashboards'],
  },
  broadway: {
    kicker: 'Experience · Planet 02',
    title: 'Design & Prompt Engineering Trainer — Broadway Infosys',
    meta: 'Nepal · Jul 2023 – Jan 2026',
    bullets: [
      'Taught Python, GenAI tools and Prompt Engineering in hands-on sessions.',
      'Designed the "Generative AI for Everyone" curriculum, which contributed to 75% growth in corporate training delivery.',
      'Integrated Prompt Engineering into the UI/UX curriculum and advocated GenAI adoption.',
      'Built and maintained training materials (slides, project plans) aligned to industry standards.',
      'Designed assessment frameworks to track learner progress and adjust content.',
    ],
    tags: ['Python', 'GenAI', 'Prompt Engineering', 'Curriculum design', 'Technical documentation'],
  },
  berojgaar: {
    kicker: 'Experience · Planet 01',
    title: 'Co-Founder — Be Rojgaar',
    meta: 'Nepal · Jul 2021 – Jun 2023',
    bullets: [
      'Built candidate sourcing and screening workflows across LinkedIn, job portals and Zoho Recruit (AI resume parsing).',
      'Tracked recruitment KPIs — outreach volume, quality-hire rate, time-to-fill — to find and fix pipeline bottlenecks.',
      'Translated ambiguous client requirements into clear hiring briefs for IT, software and data science roles.',
    ],
    tags: ['KPI tracking', 'Zoho Recruit', 'AI resume parsing', 'Stakeholder communication'],
  },
  resume: {
    kicker: 'Project · Case file 01',
    title: 'Resume Keyword Gap Checker',
    meta: 'Flask · Gemini API · Python',
    bullets: [
      'A Flask app that compares a resume with a job description through the Gemini API.',
      'Uses structured prompts and response parsing to return matched keywords, gaps and a fit verdict.',
    ],
    tags: ['Flask', 'Gemini API', 'Python', 'Prompt design'],
    links: [['View on GitHub ↗', 'https://github.com/kamleshshrestha/resume-keyword-gap-checker']],
  },
  intent: {
    kicker: 'Project · Case file 02',
    title: 'Intent Classification for Bank Customer Support',
    meta: 'DistilBERT · Hugging Face · NLP · GISMA coursework',
    bullets: [
      'Built an end-to-end NLP pipeline for classifying customer-support intents.',
      'Found that 27% of misclassifications occurred at high model confidence — a deployment risk for anyone who relies on the model\'s output.',
    ],
    tags: ['DistilBERT', 'Hugging Face', 'NLP', 'Model evaluation'],
    links: [['View notebook ↗', 'https://github.com/kamleshshrestha/academic-m508/blob/main/BigDataAnalytics.ipynb']],
  },
  cars: {
    kicker: 'Project · Case file 03',
    title: 'Used Car Market Trend EDA',
    meta: 'Pandas · NumPy · Matplotlib',
    bullets: [
      'Analysed a German used-car dataset with Pandas and NumPy.',
      'Visualised it in Matplotlib to draw pricing and demand insights for market positioning.',
    ],
    tags: ['Pandas', 'NumPy', 'Matplotlib', 'EDA'],
  },
  gisma: {
    kicker: 'Education · Tower 03',
    title: 'MSc Data Science, AI & Digital Business',
    meta: 'Gisma University of Applied Sciences, Potsdam · Jan 2026 – Feb 2027 (expected)',
    bullets: ['Relevant modules: AI for Applications, Intro to AI, Big Data Analytics, Methods of Prediction.'],
    tags: ['AI for Applications', 'Intro to AI', 'Big Data Analytics', 'Methods of Prediction'],
  },
  msc: {
    kicker: 'Education · Tower 02',
    title: 'MSc Information Technology & Applied Security',
    meta: 'London Metropolitan University (Islington College), Nepal · Apr 2020 – Oct 2022',
    bullets: ['Thesis: "Comparison of Machine Learning Algorithms for Better Candidate Matching".', 'Trained and evaluated classification models using Python, scikit-learn and spaCy.'],
    tags: ['scikit-learn', 'spaCy', 'Classification', 'Python'],
  },
  bsc: {
    kicker: 'Education · Tower 01',
    title: 'BSc Multimedia Technologies',
    meta: 'London Metropolitan University (Islington College), Nepal · Sep 2010 – Oct 2013',
    bullets: ['The creative, design-minded foundation behind how I present data today.'],
    tags: ['Multimedia', 'Design'],
  },
};

export const SKILLS = [
  // [label, category]  0 = Languages & Data, 1 = Analytics, 2 = AI & ML, 3 = Tools
  ['Python', 0], ['SQL', 0], ['PostgreSQL', 0], ['JavaScript', 0], ['HTML', 0], ['CSS', 0],
  ['Pandas', 1], ['NumPy', 1], ['Matplotlib', 1], ['Seaborn', 1], ['EDA', 1], ['Dashboards', 1], ['Data Cleaning', 1], ['KPI Tracking', 1],
  ['scikit-learn', 2], ['TensorFlow', 2], ['Hugging Face', 2], ['NLP', 2], ['LLMs', 2], ['Gemini API', 2], ['Prompt Engineering', 2], ['AI Agents', 2],
  ['Git', 3], ['Flask', 3], ['REST APIs', 3], ['Agile / SCRUM', 3], ['Tech Docs', 3],
];
export const CAT_COLORS = ['#22d3ee', '#fbbf24', '#f472b6', '#34d399'];

export const ROLES = ['Data Analyst', 'NLP & LLM builder', 'Prompt Engineering trainer', 'MSc student @ Gisma', 'Storyteller with numbers'];

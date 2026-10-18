/**
 * English UI strings and page copy. `cs.ts` must have exactly the same shape
 * (enforced by the `Dict` type and by tests/unit/i18n.test.ts).
 */
export const en = {
  meta: {
    homeTitle: 'Jan Podzimek · QA Engineer',
    homeDescription:
      'QA engineer at Alza.cz focused on API test automation in C#, AI-assisted testing and release tooling.',
    toolsTitle: 'QA tools · Jan Podzimek',
    toolsDescription:
      'Small, tested utilities for everyday testing work. Free to use in the browser.',
    builtTitle: 'How this site was built · Jan Podzimek',
    builtDescription:
      'The agentic workflow behind this site: Claude Code, project rules, implementer and reviewer agents, and tests in CI.',
    notFoundTitle: 'Page not found · Jan Podzimek',
  },
  nav: {
    skipToContent: 'Skip to content',
    about: 'About',
    work: 'Work',
    tools: 'Tools',
    contact: 'Contact',
    menu: 'Main navigation',
    themeToggle: 'Toggle dark mode',
    langSwitchLabel: 'Přepnout do češtiny',
    langSwitchShort: 'CZ',
  },
  hero: {
    eyebrow: 'QA Engineer · Alza.cz',
    pitch:
      'I test web applications, build API test automation in C#, and design AI agents that make QA faster, from test analysis to a tool that runs the release process for the whole team.',
    cv: 'Download CV',
    contact: 'Get in touch',
    photoAlt: 'Portrait of Jan Podzimek',
    facts: ['4+ years in QA', 'ISTQB® CTFL 4.0', 'English C1'],
  },
  about: {
    title: 'About me',
    paragraphs: [
      'I’m a QA engineer at Alza.cz, part of a four-person QA team covering two web applications. Over four years I’ve tested front end, back end, integrations and end-to-end flows, and I adapt to whatever the work needs.',
      'My testing is context-driven. I put critical thinking, exploration and real-time analysis ahead of rigid scripts, and I choose the technique the situation calls for instead of following predefined test cases to the letter.',
      'I don’t like splitting testers into “manual” and “automation”. Good testing combines thinking, exploring and the smart use of tools. Lately, a big part of my tools has been AI agents I designed and built myself.',
    ],
  },
  experience: {
    title: 'Experience',
    role: 'QA Engineer',
    company: 'Alza.cz a.s.',
    period: '2022 – present',
    summary: 'Member of a 4-person QA team covering two web applications.',
    highlights: [
      {
        label: 'AI-assisted testing',
        text: 'designed and set up custom GitHub Copilot agents (test analyst, test designer, documentation writer) that generate test analyses, test scenarios and application documentation.',
      },
      {
        label: 'API test framework',
        text: 'built the team’s first API test framework from scratch in C# and NUnit, running in the Azure DevOps CI pipeline.',
      },
      {
        label: 'Release automation',
        text: 'designed an internal tool and built it through agentic coding. It has largely replaced the manual release process.',
      },
      {
        label: 'Everyday QA tooling',
        text: 'on-demand deployment of any feature branch to a chosen test environment, plus utilities for daily testing, used by the whole QA team.',
      },
      {
        label: 'Test analysis & execution',
        text: 'evaluate new features, run functional and regression testing, and verify data and integrations using MS SQL, Kibana and RabbitMQ.',
      },
      {
        label: 'Release management',
        text: 'coordinate releases and monitor deployments and production stability (Argo CD, Kibana).',
      },
      { label: 'Mentoring', text: 'onboarding buddy for new team members.' },
    ],
  },
  caseStudies: {
    title: 'Selected work',
    intro:
      'Three things I built at work. Internal details are left out; the problem, approach and outcome are real.',
    problem: 'Problem',
    approach: 'Approach',
    result: 'Result',
    stack: 'Stack',
  },
  howITest: {
    title: 'How I test',
    intro:
      'Before I design a single test case, I analyse the feature. This is the checklist I use, adapted from context-driven testing.',
    items: [
      {
        title: 'Purpose & intent',
        text: 'What problem does the feature solve, for whom, and what would make it useless even if it technically works?',
      },
      {
        title: 'Tracking & monitoring',
        text: 'Entry and exit points, CRUD history and error logs, so I can see what actually happened, not just what the UI shows.',
      },
      {
        title: 'Behaviour analysis',
        text: 'Incorrect setups, invalid data and unintended use. How does it fail, and does it fail safely?',
      },
      {
        title: 'Dependencies & connections',
        text: 'Which services, queues and data does it rely on, and what breaks when one of them is slow or down?',
      },
      {
        title: 'Scenarios',
        text: 'Realistic, complex user journeys instead of isolated clicks.',
      },
      {
        title: 'Integration',
        text: 'How it behaves as part of other functionality, and whether its parts work on their own.',
      },
    ],
  },
  toolsTeaser: {
    title: 'Try my QA tools',
    intro:
      'Small utilities I use when testing, rebuilt for this site. Each one is covered by unit and UI tests.',
    all: 'All tools',
    open: 'Open tool',
  },
  skills: {
    title: 'Skills & tools',
    groups: [
      { label: 'Testing', items: 'Test analysis & design, functional, regression and API testing' },
      { label: 'Automation', items: 'C#, .NET, NUnit, HttpClient, Postman' },
      {
        label: 'AI',
        items:
          'GitHub Copilot, Claude Code, agentic coding, custom agents for test analysis, test design and documentation',
      },
      { label: 'DevOps', items: 'Azure DevOps (repos, pull requests, pipelines), Git, Argo CD' },
      { label: 'Data & monitoring', items: 'MS SQL Server, Kibana, RabbitMQ' },
      { label: 'Collaboration', items: 'Jira, Confluence, Excalidraw (mind maps)' },
    ],
  },
  credentials: {
    title: 'Certifications & education',
    certificationsTitle: 'Certifications',
    educationTitle: 'Education & training',
    viewCertificate: 'View certificate (PDF)',
    certifications: [
      {
        title: 'ISTQB® Certified Tester Foundation Level (CTFL 4.0)',
        issuer: 'ISTQB®',
        date: '07/2024',
        href: '/certificates/istqb-certificate.pdf',
      },
      {
        title: 'English – C1',
        issuer: 'goFLUENT',
        date: '03/2023',
        href: '/certificates/english-proficiency.pdf',
      },
    ],
    education: [
      {
        title: 'Object-Oriented Programming in C#',
        school: 'VŠB – Technical University of Ostrava',
        period: '05/2022 – 11/2022',
        text: '6-month course: C# and OOP, MS SQL Server, Git, HTML5/CSS3, test automation basics (MSTest, NUnit, Selenium).',
      },
      {
        title: 'Manual Software Testing',
        school: 'Software Development Academy',
        period: '12/2021 – 04/2022',
        text: 'Testing methodology per the ISTQB syllabus, test scenarios, test cases and bug reports.',
      },
    ],
  },
  beyond: {
    title: 'Outside of work',
    items: [
      {
        title: 'Puzzles',
        text: 'Puzzles train the same skills as testing: patience, creativity and looking at a problem from a different angle.',
      },
      {
        title: 'Sport',
        text: 'Running, hiking, badminton, obstacle races, the gym. Anything that keeps me moving.',
      },
    ],
    photos: {
      hiking: 'Resting on a mountain ridge after a hike',
      race: 'Hanging from an obstacle at a Gladiator Race',
      guitar: 'Playing guitar by a campfire',
    },
  },
  contact: {
    title: 'Let’s talk',
    text: 'I’m open to new opportunities and to conversations about testing, automation and AI in QA.',
    email: 'Send an email',
    linkedin: 'LinkedIn',
    github: 'GitHub',
  },
  footer: {
    built: 'How this site was built',
    source: 'Source code',
    note: 'Built with Astro and Claude Code. Tested with Playwright.',
  },
  built: {
    title: 'How this site was built',
    intro:
      'This site is also a work sample. I built it with Claude Code, using the same agentic workflow I use at work. Here is how it works.',
    sections: [
      {
        title: 'The goal',
        text: 'A fast, accessible, bilingual site that presents me as a QA engineer, plus a few small working tools. And a repository that shows how I work with AI agents: with clear rules, tests and review, not blind trust.',
      },
      {
        title: 'Project rules (CLAUDE.md)',
        text: 'A file the agent reads at the start of every session. It describes the architecture, the stack and why it was chosen, and the hard rules: every change ships with a test, every text exists in English and Czech, no new dependency without a reason, accessibility checks must pass, and nothing goes to main without review.',
      },
      {
        title: 'Two agents, two jobs',
        text: 'An implementer agent builds features and fixes, and must add tests. A separate reviewer agent, which can read but not edit, checks every change against the project rules, analyses risks and reports findings by severity. The author never reviews their own work.',
      },
      {
        title: 'Skills: repeatable workflows',
        text: 'Slash commands like /new-feature, /fix-bug, /new-tool, /review and /deploy encode the steps for common tasks. A bug fix, for example, always starts with a failing test that reproduces it.',
      },
      {
        title: 'Hooks: rules that are enforced',
        text: 'Some rules are too important to leave to instructions. Hooks format every edited file, block pushes to main, and run the checks before the agent is allowed to say it’s done.',
      },
      {
        title: 'Quality gates',
        text: 'Every pull request runs linting, type checks, unit tests (Vitest), a production build, and UI and accessibility tests (Playwright + axe) on desktop and mobile in GitHub Actions. Vercel deploys a preview of every pull request.',
      },
    ],
    stackTitle: 'Stack',
    stack: [
      'Astro (static HTML, almost no JavaScript)',
      'Tailwind CSS',
      'TypeScript (strict)',
      'Vitest + Playwright + axe-core',
      'GitHub Actions + Vercel',
      'Claude Code',
    ],
    repoCta: 'Browse the repository',
  },
  tools: {
    hubTitle: 'QA tools',
    hubIntro:
      'Small utilities for everyday testing work. Everything runs in your browser and nothing is sent anywhere.',
    backToTools: 'All tools',
    viewSource: 'Source',
    viewTests: 'Tests',
    clear: 'Clear',
    copy: 'Copy',
    copied: 'Copied to clipboard',
    copyFailed: 'Copy failed. Select the text and copy it manually.',
    yes: 'Yes',
    no: 'No',
    columnDelimiter: {
      title: 'Column delimiter',
      description:
        'Paste one record per line and get them joined into a delimited list, e.g. for a SQL IN clause or a Jira JQL filter.',
      input: 'Column data',
      inputPlaceholder: 'One record per line',
      output: 'Delimited data',
      records: 'Records',
      delimiter: 'Delimiter',
      customDelimiter: 'Custom delimiter',
      comma: 'Comma',
      semicolon: 'Semicolon',
      pipe: 'Pipe',
      tab: 'Tab',
      quotes: 'Quotes',
      quoteNone: 'None',
      quoteDouble: 'Double',
      quoteSingle: 'Single',
      singleLine: 'Single line',
      removeDuplicates: 'Remove duplicates',
    },
    charCounter: {
      title: 'Character counter',
      description:
        'Count characters, words, lines and bytes. Handles diacritics and emoji correctly, which is handy for testing field length limits.',
      input: 'Text',
      inputPlaceholder: 'Type or paste text',
      characters: 'Characters',
      charactersNoSpaces: 'Without spaces',
      words: 'Words',
      lines: 'Lines',
      bytes: 'Bytes (UTF-8)',
    },
  },
  notFound: {
    title: 'Page not found',
    text: 'This page doesn’t exist. Maybe it never did, or maybe I found a bug.',
    back: 'Back to the homepage',
  },
};

export type Dict = typeof en;

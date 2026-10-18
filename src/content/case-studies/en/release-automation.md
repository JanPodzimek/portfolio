---
title: Release automation tool
summary: An internal tool, built through agentic coding, that took over most of the manual release process.
order: 1
stack: [Agentic coding (GitHub Copilot), Azure DevOps, Argo CD, Microsoft Teams]
problem: >-
  Every release meant the same manual routine: creating release-candidate branches in several
  repositories, opening and merging pull requests, deploying to the dev environment and telling
  the team. It was slow, repetitive and easy to get wrong.
approach:
  - Designed the tool around the team's real release checklist.
  - Built it through agentic coding with GitHub Copilot. I defined the behaviour, then reviewed and tested every change.
  - It creates RC branches across repositories and opens and merges pull requests with descriptions.
  - It deploys the release candidate to dev for regression testing and posts a notification to the Teams release channel.
result:
  - Largely replaced the manual release process.
  - Extended with on-demand deployment of any feature branch to a chosen test environment, used by the whole QA team.
---

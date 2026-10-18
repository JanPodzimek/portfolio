---
title: The team's first API test framework
summary: Built from scratch in C# and NUnit and wired into the Azure DevOps CI pipeline.
order: 2
stack: [C#, .NET, NUnit, HttpClient, Azure DevOps Pipelines]
problem: >-
  Before each release the APIs were checked by hand. That cost time on every release, and there
  was no automated safety net to catch regressions early.
approach:
  - Designed the framework from scratch in C# and NUnit, using HttpClient.
  - Added health-check coverage of every endpoint as a fast first line of defence.
  - Built functional, authorization and validation suites on top.
  - Runs automatically in the Azure DevOps CI pipeline.
result:
  - Cut manual testing time before each release.
  - Gave the team a shared base that new API tests plug into.
---

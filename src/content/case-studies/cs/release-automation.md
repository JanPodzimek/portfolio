---
title: Nástroj pro automatizaci releasu
summary: Interní nástroj postavený agentním programováním, který převzal většinu ručního procesu releasu.
order: 1
stack: [Agentní programování (GitHub Copilot), Azure DevOps, Argo CD, Microsoft Teams]
problem: >-
  Každý release znamenal stejnou ruční rutinu: vytvořit release-candidate větve v několika
  repozitářích, otevřít a mergnout pull requesty, nasadit na dev prostředí a dát vědět týmu.
  Bylo to pomalé, opakované a snadno se v tom chybovalo.
approach:
  - Navrhl jsem nástroj podle skutečného release checklistu týmu.
  - Postavil jsem ho agentním programováním v GitHub Copilotu. Chování jsem definoval já a každou změnu jsem zreviewoval a otestoval.
  - Vytváří RC větve napříč repozitáři a otevírá a merguje pull requesty s popisem.
  - Nasadí release candidate na dev pro regresní testy a pošle notifikaci do release kanálu v Teams.
result:
  - Z velké části nahradil ruční proces releasu.
  - Rozšířen o nasazení libovolné feature větve na zvolené testovací prostředí, používá ho celý QA tým.
---

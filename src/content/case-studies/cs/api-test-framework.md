---
title: První API testovací framework týmu
summary: Postavený od nuly v C# a NUnit a zapojený do CI pipeline v Azure DevOps.
order: 2
stack: [C#, .NET, NUnit, HttpClient, Azure DevOps Pipelines]
problem: >-
  Před každým releasem se API kontrolovala ručně. Stálo to čas při každém releasu a chyběla
  automatická záchranná síť, která by regrese zachytila včas.
approach:
  - Navrhl jsem framework od nuly v C# a NUnit nad HttpClientem.
  - Health-check testy pokrývají každý endpoint jako rychlou první linii obrany.
  - Nad nimi jsou sady funkčních, autorizačních a validačních testů.
  - Testy běží automaticky v CI pipeline v Azure DevOps.
result:
  - Zkrátil čas ručního testování před každým releasem.
  - Dal týmu společný základ, do kterého se přidávají nové API testy.
---

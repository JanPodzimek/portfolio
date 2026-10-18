import type { Dict } from './en';

/** Czech UI strings and page copy. Same shape as `en.ts`. */
export const cs: Dict = {
  meta: {
    homeTitle: 'Jan Podzimek · QA Engineer',
    homeDescription:
      'QA engineer ve společnosti Alza.cz se zaměřením na automatizaci API testů v C#, testování s pomocí AI a nástroje pro release.',
    toolsTitle: 'QA nástroje · Jan Podzimek',
    toolsDescription:
      'Malé otestované nástroje pro každodenní testování. Zdarma přímo v prohlížeči.',
    builtTitle: 'Jak vznikl tento web · Jan Podzimek',
    builtDescription:
      'Agentní workflow za tímto webem: Claude Code, pravidla projektu, agent pro implementaci a agent pro review, testy v CI.',
    notFoundTitle: 'Stránka nenalezena · Jan Podzimek',
  },
  nav: {
    skipToContent: 'Přejít na obsah',
    about: 'O mně',
    work: 'Práce',
    tools: 'Nástroje',
    contact: 'Kontakt',
    menu: 'Hlavní navigace',
    themeToggle: 'Přepnout tmavý režim',
    langSwitchLabel: 'Switch to English',
    langSwitchShort: 'EN',
  },
  hero: {
    eyebrow: 'QA Engineer · Alza.cz',
    pitch:
      'Testuji webové aplikace, automatizuji API testy v C# a navrhuji AI agenty, kteří QA zrychlují, od testové analýzy až po nástroj, který za celý tým řídí release.',
    cv: 'Stáhnout CV (EN)',
    contact: 'Napište mi',
    photoAlt: 'Portrét Jana Podzimka',
    facts: ['4+ roky v QA', 'ISTQB® CTFL 4.0', 'Angličtina C1'],
  },
  about: {
    title: 'O mně',
    paragraphs: [
      'Jsem QA engineer ve společnosti Alza.cz, ve čtyřčlenném QA týmu, který pokrývá dvě webové aplikace. Za čtyři roky jsem testoval frontend, backend, integrace i end-to-end scénáře a přizpůsobím se tomu, co práce zrovna potřebuje.',
      'Testuji podle kontextu. Kritické myšlení, průzkum a analýzu za běhu upřednostňuji před pevnými scénáři a techniku volím podle situace, místo abych slepě procházel předem připravené testovací případy.',
      'Nemám rád dělení testerů na „manuální“ a „automatizované“. Dobré testování kombinuje přemýšlení, zkoumání a chytré použití nástrojů. Velkou část mých nástrojů dnes tvoří AI agenti, které jsem sám navrhl a postavil.',
    ],
  },
  experience: {
    title: 'Zkušenosti',
    role: 'QA Engineer',
    company: 'Alza.cz a.s.',
    period: '2022 – současnost',
    summary: 'Člen čtyřčlenného QA týmu, který pokrývá dvě webové aplikace.',
    highlights: [
      {
        label: 'Testování s pomocí AI',
        text: 'navrhl jsem a nastavil vlastní agenty v GitHub Copilotu (testový analytik, návrhář testů, autor dokumentace), kteří připravují testové analýzy, testovací scénáře a dokumentaci aplikace.',
      },
      {
        label: 'Framework pro API testy',
        text: 'od nuly jsem postavil první API testovací framework týmu v C# a NUnit, který běží v CI pipeline v Azure DevOps.',
      },
      {
        label: 'Automatizace releasu',
        text: 'navrhl jsem interní nástroj a postavil ho pomocí agentního programování. Z velké části nahradil ruční proces releasu.',
      },
      {
        label: 'Nástroje pro každodenní QA',
        text: 'nástroj jsem rozšířil o nasazení libovolné feature větve na zvolené testovací prostředí a o pomůcky pro každodenní testování, které používá celý QA tým.',
      },
      {
        label: 'Testová analýza a provádění testů',
        text: 'hodnotím nové funkce, provádím funkční a regresní testy a ověřuji data a integrace pomocí MS SQL, Kibany a RabbitMQ.',
      },
      {
        label: 'Release management',
        text: 'koordinuji releasy a sleduji nasazení a stabilitu produkce (Argo CD, Kibana).',
      },
      { label: 'Mentoring', text: 'jsem onboarding buddy pro nové členy týmu.' },
    ],
  },
  caseStudies: {
    title: 'Vybraná práce',
    intro:
      'Tři věci, které jsem postavil v práci. Interní detaily jsem vynechal; problém, přístup i výsledek jsou skutečné.',
    problem: 'Problém',
    approach: 'Přístup',
    result: 'Výsledek',
    stack: 'Technologie',
  },
  howITest: {
    title: 'Jak testuji',
    intro:
      'Než navrhnu první testovací případ, analyzuji funkci. Tohle je checklist, který používám, inspirovaný kontextovým testováním.',
    items: [
      {
        title: 'Účel a záměr',
        text: 'Jaký problém funkce řeší, pro koho, a co by ji udělalo nepoužitelnou, i když technicky funguje?',
      },
      {
        title: 'Sledování a monitoring',
        text: 'Vstupní a výstupní body, historie CRUD operací a chybové logy, abych viděl, co se skutečně stalo, ne jen co ukazuje UI.',
      },
      {
        title: 'Analýza chování',
        text: 'Chybná nastavení, nevalidní data a nezamýšlené použití. Jak funkce selhává a je to selhání bezpečné?',
      },
      {
        title: 'Závislosti a vazby',
        text: 'Na kterých službách, frontách a datech funkce závisí a co se rozbije, když je některá z nich pomalá nebo nedostupná?',
      },
      {
        title: 'Scénáře',
        text: 'Realistické a komplexní uživatelské cesty místo izolovaných kliknutí.',
      },
      {
        title: 'Integrace',
        text: 'Jak se funkce chová jako součást jiných funkcí a zda její části fungují i samostatně.',
      },
    ],
  },
  toolsTeaser: {
    title: 'Vyzkoušejte moje QA nástroje',
    intro:
      'Malé pomůcky, které používám při testování, znovu postavené pro tento web. Každou pokrývají unit i UI testy.',
    all: 'Všechny nástroje',
    open: 'Otevřít nástroj',
  },
  skills: {
    title: 'Dovednosti a nástroje',
    groups: [
      {
        label: 'Testování',
        items: 'Testová analýza a návrh testů, funkční, regresní a API testování',
      },
      { label: 'Automatizace', items: 'C#, .NET, NUnit, HttpClient, Postman' },
      {
        label: 'AI',
        items:
          'GitHub Copilot, Claude Code, agentní programování, vlastní agenti pro testovou analýzu, návrh testů a dokumentaci',
      },
      {
        label: 'DevOps',
        items: 'Azure DevOps (repozitáře, pull requesty, pipeline), Git, Argo CD',
      },
      { label: 'Data a monitoring', items: 'MS SQL Server, Kibana, RabbitMQ' },
      { label: 'Spolupráce', items: 'Jira, Confluence, Excalidraw (myšlenkové mapy)' },
    ],
  },
  credentials: {
    title: 'Certifikace a vzdělání',
    certificationsTitle: 'Certifikace',
    educationTitle: 'Vzdělání a kurzy',
    viewCertificate: 'Zobrazit certifikát (PDF)',
    certifications: [
      {
        title: 'ISTQB® Certified Tester Foundation Level (CTFL 4.0)',
        issuer: 'ISTQB®',
        date: '07/2024',
        href: '/certificates/istqb-certificate.pdf',
      },
      {
        title: 'Angličtina – C1',
        issuer: 'goFLUENT',
        date: '03/2023',
        href: '/certificates/english-proficiency.pdf',
      },
    ],
    education: [
      {
        title: 'Objektově orientované programování v C#',
        school: 'VŠB – Technická univerzita Ostrava',
        period: '05/2022 – 11/2022',
        text: 'Šestiměsíční kurz: C# a OOP, MS SQL Server, Git, HTML5/CSS3, základy automatizace testů (MSTest, NUnit, Selenium).',
      },
      {
        title: 'Manuální testování softwaru',
        school: 'Software Development Academy',
        period: '12/2021 – 04/2022',
        text: 'Metodika testování podle sylabu ISTQB, testovací scénáře, testovací případy a bug reporty.',
      },
    ],
  },
  beyond: {
    title: 'Mimo práci',
    items: [
      {
        title: 'Hlavolamy',
        text: 'Hlavolamy trénují to samé co testování: trpělivost, kreativitu a schopnost podívat se na problém z jiného úhlu.',
      },
      {
        title: 'Sport',
        text: 'Běh, turistika, badminton, překážkové závody, posilovna. Cokoliv, co mě udrží v pohybu.',
      },
    ],
    photos: {
      hiking: 'Odpočinek na horském hřebeni po túře',
      race: 'Ručkování na překážce při Gladiator Race',
      guitar: 'Hraní na kytaru u táboráku',
    },
  },
  contact: {
    title: 'Ozvěte se',
    text: 'Jsem otevřený novým příležitostem i rozhovorům o testování, automatizaci a AI v QA.',
    email: 'Poslat e-mail',
    linkedin: 'LinkedIn',
    github: 'GitHub',
  },
  footer: {
    built: 'Jak vznikl tento web',
    source: 'Zdrojový kód',
    note: 'Postaveno v Astru a Claude Code. Otestováno Playwrightem.',
  },
  built: {
    title: 'Jak vznikl tento web',
    intro:
      'Tento web je zároveň ukázkou práce. Postavil jsem ho v Claude Code stejným agentním workflow, jaké používám v práci. Takhle to funguje.',
    sections: [
      {
        title: 'Cíl',
        text: 'Rychlý, přístupný, dvojjazyčný web, který mě představí jako QA engineera, plus pár malých funkčních nástrojů. A repozitář, který ukazuje, jak pracuji s AI agenty: s jasnými pravidly, testy a review, ne se slepou důvěrou.',
      },
      {
        title: 'Pravidla projektu (CLAUDE.md)',
        text: 'Soubor, který si agent přečte na začátku každé session. Popisuje architekturu, zvolené technologie i důvody jejich volby a pevná pravidla: každá změna má test, každý text existuje anglicky i česky, žádná nová závislost bez důvodu, kontroly přístupnosti musí projít a nic nejde do main bez review.',
      },
      {
        title: 'Dva agenti, dvě role',
        text: 'Agent pro implementaci staví funkce a opravy a musí k nim přidat testy. Samostatný agent pro review, který smí číst, ale ne upravovat, kontroluje každou změnu proti pravidlům projektu, analyzuje rizika a hlásí nálezy podle závažnosti. Autor nikdy nereviewuje vlastní práci.',
      },
      {
        title: 'Skills: opakovatelné postupy',
        text: 'Příkazy jako /new-feature, /fix-bug, /new-tool, /review a /deploy popisují kroky běžných úkolů. Oprava chyby například vždy začíná padajícím testem, který chybu reprodukuje.',
      },
      {
        title: 'Hooks: vynucená pravidla',
        text: 'Některá pravidla jsou příliš důležitá na to, aby zůstala jen v instrukcích. Hooky naformátují každý upravený soubor, zablokují push do main a spustí kontroly dřív, než agent smí říct, že je hotovo.',
      },
      {
        title: 'Kontroly kvality',
        text: 'Každý pull request v GitHub Actions spustí linting, kontrolu typů, unit testy (Vitest), produkční build a UI testy včetně přístupnosti (Playwright + axe) na desktopu i mobilu. Vercel nasadí náhled každého pull requestu.',
      },
    ],
    stackTitle: 'Technologie',
    stack: [
      'Astro (statické HTML, téměř bez JavaScriptu)',
      'Tailwind CSS',
      'TypeScript (strict)',
      'Vitest + Playwright + axe-core',
      'GitHub Actions + Vercel',
      'Claude Code',
    ],
    repoCta: 'Prohlédnout repozitář',
  },
  tools: {
    hubTitle: 'QA nástroje',
    hubIntro:
      'Malé pomůcky pro každodenní testování. Vše běží ve vašem prohlížeči a nic se nikam neodesílá.',
    backToTools: 'Všechny nástroje',
    viewSource: 'Zdrojový kód',
    viewTests: 'Testy',
    clear: 'Vymazat',
    copy: 'Kopírovat',
    copied: 'Zkopírováno do schránky',
    copyFailed: 'Kopírování selhalo. Označte text a zkopírujte ho ručně.',
    yes: 'Ano',
    no: 'Ne',
    columnDelimiter: {
      title: 'Oddělovač sloupce',
      description:
        'Vložte záznamy, každý na samostatný řádek, a nástroj je spojí do seznamu, např. pro SQL klauzuli IN nebo filtr v Jira JQL.',
      input: 'Data ve sloupci',
      inputPlaceholder: 'Jeden záznam na řádek',
      output: 'Oddělená data',
      records: 'Počet záznamů',
      delimiter: 'Oddělovač',
      customDelimiter: 'Vlastní oddělovač',
      comma: 'Čárka',
      semicolon: 'Středník',
      pipe: 'Svislá čára',
      tab: 'Tabulátor',
      quotes: 'Uvozovky',
      quoteNone: 'Žádné',
      quoteDouble: 'Dvojité',
      quoteSingle: 'Jednoduché',
      singleLine: 'Na jeden řádek',
      removeDuplicates: 'Odstranit duplicity',
    },
    charCounter: {
      title: 'Počítadlo znaků',
      description:
        'Spočítá znaky, slova, řádky a bajty. Správně zvládá diakritiku i emoji, což se hodí při testování limitů délky polí.',
      input: 'Text',
      inputPlaceholder: 'Napište nebo vložte text',
      characters: 'Znaky',
      charactersNoSpaces: 'Bez mezer',
      words: 'Slova',
      lines: 'Řádky',
      bytes: 'Bajty (UTF-8)',
    },
  },
  notFound: {
    title: 'Stránka nenalezena',
    text: 'Tahle stránka neexistuje. Možná nikdy neexistovala, nebo jsem našel bug.',
    back: 'Zpět na úvod',
  },
};

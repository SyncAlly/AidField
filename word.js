const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  LevelFormat, Table, TableRow, TableCell, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageBreak, PageNumber, NumberFormat,
  Header, Footer, TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

const TNR = 'Times New Roman';
const SZ = 24; // 12pt
const LS = 360; // 1.5 line spacing
const SA = 120; // 6pt after

// ── helpers ──────────────────────────────────────────────────────────────────
const t = (text, opts = {}) => new TextRun({ text, font: TNR, size: SZ, ...opts });
const tb = (text) => t(text, { bold: true });

const p = (text, opts = {}) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: LS, lineRule: 'auto', after: SA },
  children: [t(text)],
  ...opts,
});

const pRuns = (runs, opts = {}) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: LS, lineRule: 'auto', after: SA },
  children: runs,
  ...opts,
});

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  alignment: AlignmentType.LEFT,
  spacing: { before: 480, after: SA, line: LS, lineRule: 'auto' },
  children: [new TextRun({ text, font: TNR, size: 28, bold: true })],
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  alignment: AlignmentType.LEFT,
  spacing: { before: 280, after: SA, line: LS, lineRule: 'auto' },
  children: [new TextRun({ text, font: TNR, size: 24, bold: true })],
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  alignment: AlignmentType.LEFT,
  spacing: { before: 200, after: SA, line: LS, lineRule: 'auto' },
  children: [new TextRun({ text, font: TNR, size: 24, bold: true, italics: true })],
});

const blank = () => new Paragraph({
  spacing: { after: SA, line: LS, lineRule: 'auto' },
  children: [t('')],
});

const bul = (text) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: LS, lineRule: 'auto', after: SA },
  children: [t(text)],
});

const num = (text) => new Paragraph({
  numbering: { reference: 'numbers', level: 0 },
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: LS, lineRule: 'auto', after: SA },
  children: [t(text)],
});

const centered = (text, opts = {}) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { line: LS, lineRule: 'auto', after: SA },
  children: [new TextRun({ text, font: TNR, size: SZ, ...opts })],
});

const tableCaption = (text) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 160, after: 80, line: LS, lineRule: 'auto' },
  children: [new TextRun({ text, font: TNR, size: SZ, bold: true })],
});

const pageBreak = () => new Paragraph({
  children: [new PageBreak()],
  spacing: { after: 0 },
});

// ── Table helpers ─────────────────────────────────────────────────────────────
const bdr = { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' };
const bdrs = { top: bdr, bottom: bdr, left: bdr, right: bdr };
const hdrShade = { fill: '1C2B36', type: ShadingType.CLEAR };
const altShade = { fill: 'F0F4F8', type: ShadingType.CLEAR };
const clrShade = { fill: 'FFFFFF', type: ShadingType.CLEAR };

const tc = (text, opts = {}) => new TableCell({
  borders: bdrs,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  verticalAlign: VerticalAlign.CENTER,
  shading: opts.shading || clrShade,
  width: opts.w ? { size: opts.w, type: WidthType.DXA } : undefined,
  children: [new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { line: 264, after: 0 },
    children: [new TextRun({ text, font: TNR, size: 20, bold: opts.bold || false, color: opts.color || '000000' })],
  })],
});

const hRow = (texts, ws) => new TableRow({
  tableHeader: true,
  children: texts.map((tx, i) => tc(tx, { bold: true, color: 'FFFFFF', shading: hdrShade, w: ws[i], center: true })),
});

const dRow = (cells, ws, alt = false) => new TableRow({
  children: cells.map((c, i) => tc(c.text || c, { bold: c.bold, shading: alt ? altShade : clrShade, w: ws[i], center: c.center })),
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'alpha', levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: '%1)', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: TNR, size: SZ } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, font: TNR, color: '000000' }, paragraph: { spacing: { before: 480, after: SA }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, font: TNR, color: '000000' }, paragraph: { spacing: { before: 280, after: SA }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, italics: true, font: TNR, color: '000000' }, paragraph: { spacing: { before: 200, after: SA }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 2160 },
      },
    },
    children: [

// ═══════════════════════════════════════════════════════════════════════════════
// TITLE PAGE
// ═══════════════════════════════════════════════════════════════════════════════
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1440, after: 480, line: LS }, children: [new TextRun({ text: 'MULTIMEDIA UNIVERSITY OF KENYA', font: TNR, size: 28, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240, line: LS }, children: [new TextRun({ text: 'Faculty of Computing and Information Technology', font: TNR, size: 24 })] }),
      blank(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240, line: LS }, children: [new TextRun({ text: 'AidField', font: TNR, size: 40, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240, line: LS }, children: [new TextRun({ text: 'Offline-First Emergency First Aid and AI Triage Mobile Application', font: TNR, size: 28, italics: true })] }),
      blank(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240, line: LS }, children: [new TextRun({ text: 'A Project Report Submitted in Partial Fulfilment of the Requirements', font: TNR, size: 24 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240, line: LS }, children: [new TextRun({ text: 'for the Award of the Degree of Bachelor of Science in', font: TNR, size: 24 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 480, line: LS }, children: [new TextRun({ text: 'Computer Science', font: TNR, size: 24, bold: true })] }),
      blank(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240, line: LS }, children: [new TextRun({ text: '2026', font: TNR, size: 24 })] }),
      pageBreak(),

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER ONE: INTRODUCTION
// ═══════════════════════════════════════════════════════════════════════════════
      centered('CHAPTER ONE: INTRODUCTION', { bold: true, size: 28 }),
      blank(),

      h1('1.1 Background'),
      p('Medical emergencies in Kenya frequently occur far from professional help, with rural response times of 30 to 90 minutes. Despite over 50% smartphone penetration, nearly all first aid applications require an internet connection — making them unusable in the remote areas and disaster zones where they are needed most. Meanwhile, most guides assume a standard medical kit is available, leaving bystanders unable to improvise with what they have around them.'),
      p('AidField addresses this by combining an offline-first downloadable mobile application with AI-assisted triage to provide always-available, contextually relevant emergency guidance. The application is built using React Native, enabling it to run as a native app on both Android and iOS devices. On Android, it is distributed as a downloadable APK file, removing the requirement for a Google Play Store account and enabling installation via direct download, QR code, or USB transfer — distribution methods already familiar and practical for users across Kenya and East Africa.'),

      h1('1.2 Problem Statement'),
      p('Three compounding problems define the gap AidField seeks to fill:'),
      bul('No connectivity, no help — existing first aid apps fail without internet, precisely when emergencies are most likely to occur without professional assistance nearby.'),
      bul('No improvised resource guidance — standard guides assume a medical kit is available; no application teaches users how to substitute household items such as belts, sticks, or cloth for medical supplies.'),
      bul('Panic and decision paralysis — untrained bystanders freeze in emergencies. Without a calm, AI-guided, step-by-step interface that supports voice and visual input, correct first aid responses are rarely applied under acute stress.'),

      h1('1.3 Aim and Research Objectives'),
      p('Aim: To design and develop AidField — an offline-first, AI-assisted downloadable mobile application that provides emergency first aid guidance with improvised resource recommendations, multimodal input (text, voice, and visual), and graceful offline degradation, accessible to non-medical users in low-connectivity environments.'),
      p('Specific objectives:'),
      bul('Investigate first aid knowledge gaps and emergency response challenges faced by non-medical users in low-connectivity environments in Kenya.'),
      bul('Design a user-centred, panic-proof interface that minimises cognitive load under acute stress, with support for text, voice, and visual camera input.'),
      bul('Develop and integrate an AI triage module using the Google Gemini API that interprets plain-language, speech-transcribed, and image-based emergency descriptions.'),
      bul('Implement an improvised resource recommendation engine mapping common household materials to standard first aid equipment substitutes.'),
      bul('Evaluate the usability, accuracy, and effectiveness of AidField through user testing with representative target users.'),

      h1('1.4 Significance of the Study'),
      tableCaption('Table 1.1: Significance of the Study'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2400, 6626],
        rows: [
          hRow(['Dimension', 'Key Point'], [2400, 6626]),
          dRow([{ text: 'Social and Health', bold: true }, { text: 'Up to 40% of trauma deaths are preventable with timely first aid (WHO, 2021). AidField bridges the critical gap before professional help arrives, specifically targeting rural and peri-urban Kenya where clinics can be 30 to 90 minutes away.' }], [2400, 6626], false),
          dRow([{ text: 'Technological', bold: true }, { text: 'Demonstrates offline-first AI in a high-stakes native mobile context; advances mHealth design for emerging markets using React Native, SQLite local storage, the Google Gemini API, and native speech recognition and camera APIs.' }], [2400, 6626], true),
          dRow([{ text: 'Academic', bold: true }, { text: 'Contributes to HCI in crisis scenarios literature; aligned with SDG 3 (Good Health and Well-Being) and provides a replicable framework for health apps in developing countries.' }], [2400, 6626], false),
        ],
      }),
      blank(),

      h1('1.5 Scope'),
      p('The system is developed as a downloadable native mobile application using React Native, deployable on Android and iOS. On Android, the application is distributed as an APK file, enabling installation without a Google Play Store account. On iOS, it is distributed via TestFlight during development and evaluation, with App Store submission planned for the post-project production release. The application integrates the Google Gemini API for AI-assisted triage, speech interpretation, and image-based injury assessment when internet connectivity is available, and a SQLite-stored library of 50 pre-loaded emergency scenarios for full offline use.'),
      p('Content covers bleeding control, burns, choking, fractures, seizures, poisoning, drowning, snake bites, allergic reactions, and cardiac arrest, with improvised material substitutes for each scenario. The application supports English and Swahili and includes pre-loaded Kenya emergency contacts (999, 112, Kenya Red Cross 0800 723 999). It is geographically focused on Kenya, particularly Nairobi, Kiambu, Mombasa, and Nakuru counties. The system does not provide medical diagnosis, telemedicine, remote monitoring, or veterinary guidance.'),

      h1('1.6 Assumptions'),
      bul('Users have basic smartphone literacy sufficient to download and use a native mobile application.'),
      bul('Target Android devices run Android 8.0 (API level 26) or above; target iOS devices run iOS 14 or above.'),
      bul('The app is used as a supplement to — not a replacement for — calling professional emergency services where available.'),
      bul('Listed improvised materials are commonly accessible in typical Kenyan households and environments.'),
      bul('Emergency contact data is accurate at the time of development and will be maintained through periodic app updates.'),
      bul('Users on Android are willing and able to install an APK via the Install from Unknown Sources setting, which is a standard and widely practised installation method in Kenya.'),

      h1('1.7 Limitations and Counter-Measures'),
      tableCaption('Table 1.2: Limitations and Counter-Measures'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [3000, 6026],
        rows: [
          hRow(['Limitation', 'Counter-Measure'], [3000, 6026]),
          dRow([{ text: 'AI accuracy for rare or complex presentations', bold: true }, { text: 'Medically validated static guides stored in SQLite serve as the primary source; AI supplements but does not override them. A minimum 90% accuracy threshold is enforced through iterative prompt engineering and testing.' }], [3000, 6026], false),
          dRow([{ text: 'Language and literacy barriers', bold: true }, { text: 'Icon-based navigation, text-to-speech readout of all first aid steps at adjustable speed, and full Swahili translation of all scenario content alongside English.' }], [3000, 6026], true),
          dRow([{ text: 'Offline AI constraints', bold: true }, { text: 'A library of 50 pre-cached scenarios is loaded into SQLite on first install. When offline, AI features are hidden and the user is automatically routed to the closest matching scenario via keyword matching and a decision tree.' }], [3000, 6026], false),
          dRow([{ text: 'Risk of misuse', bold: true }, { text: 'Every screen displays a persistent emergency call prompt with one-tap dialling of 999, 112, and Kenya Red Cross. Urgency-level indicators in every scenario guide users on when to call for help immediately.' }], [3000, 6026], true),
          dRow([{ text: 'iOS distribution without App Store', bold: true }, { text: 'During development and evaluation, iOS distribution is handled via TestFlight. App Store submission is planned for the post-project production release.' }], [3000, 6026], false),
          dRow([{ text: 'API rate limits on free tier', bold: true }, { text: 'Error handling routes users to offline scenarios on 429 or timeout errors. The application always delivers actionable guidance regardless of API availability.' }], [3000, 6026], true),
        ],
      }),
      blank(),

      h1('1.8 Chapter Summary'),
      p('This chapter has established the background, problem, objectives, significance, scope, and limitations of the AidField project. The core argument is that a critical gap exists in emergency first aid access for people in low-connectivity, resource-constrained environments in Kenya — and that an offline-first, AI-powered native mobile application distributed as a downloadable APK is a technically feasible and socially meaningful solution. The application is built with React Native, uses SQLite for offline scenario storage, the Google Gemini API for intelligent online triage, and native device APIs for speech recognition, text-to-speech, and visual input. Chapter Two reviews related systems and existing literature to ground this work in current knowledge.'),

      pageBreak(),

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER TWO: LITERATURE REVIEW
// ═══════════════════════════════════════════════════════════════════════════════
      centered('CHAPTER TWO: LITERATURE REVIEW', { bold: true, size: 28 }),
      blank(),

      h1('2.1 Introduction'),
      p('This chapter presents a comprehensive review of existing literature and systems related to emergency response, first aid guidance technology, and offline-first mobile applications. The review examines published works, existing platforms, and comparable systems that inform the design and development of AidField. The purpose of this review is to identify gaps in current solutions and to justify the design decisions made in the proposed system.'),
      p('Every year, millions of individuals worldwide find themselves in emergency situations where immediate intervention could mean the difference between life and death. Research by the World Health Organization (WHO, 2021) indicates that approximately 4.4 million people die annually from injuries that could have been prevented or mitigated with prompt first aid. The critical golden hour — the period immediately following a traumatic event — is well-documented in emergency medicine literature as the most decisive window for life-saving intervention (Tintinalli et al., 2020). Despite this, the majority of bystanders lack the knowledge, confidence, or tools to act effectively during this window.'),
      p('The proliferation of smartphones, now reaching over 6.8 billion users globally (Statista, 2023), presents an unprecedented opportunity to bridge the gap between emergency events and informed response. Mobile health (mHealth) applications have grown substantially, yet most existing solutions are either heavily internet-dependent, too complex for use under stress, or lack the breadth of coverage needed to address a wide range of real-world emergencies. AidField addresses these shortcomings through an offline-first architecture combined with an AI-powered online tier.'),

      h1('2.2 Review of Related Systems'),

      h2('2.2.1 American Red Cross First Aid App'),
      p('The American Red Cross First Aid application is one of the most widely recognised mobile first aid tools, available on both Android and iOS platforms. The application provides step-by-step guidance for a variety of common emergencies including burns, bleeding, choking, and cardiac arrest. According to the American Red Cross (2022), the application includes videos, interactive quizzes, and a hospital locator feature. It supports offline access for a subset of its content, making it partially functional without internet connectivity.'),
      p('However, the application has several notable limitations. It relies heavily on pre-authored static content and does not support dynamic querying or AI-based interpretation of novel or complex emergency scenarios. The offline capability is limited in scope, and the application does not support voice input or image-based injury assessment, making it difficult to use in hands-free situations. Furthermore, the application is geographically and contextually calibrated for a North American audience, limiting its relevance in regions with different resource environments.'),

      h2('2.2.2 First Aid by St John Ambulance'),
      p('The St John Ambulance First Aid application provides evidence-based guidance on a range of emergency scenarios. The app features clearly illustrated step-by-step instructions, covering incidents such as anaphylaxis, stroke, seizures, and fractures. The content is reviewed and updated by clinical professionals, and the application is available on both major mobile platforms (St John Ambulance, 2023).'),
      p('Despite these strengths, the application shares several limitations with the Red Cross app. All content is static and pre-authored; there is no mechanism for users to describe an unusual or ambiguous emergency and receive tailored guidance. The application does not support voice input or visual image analysis, and its offline capability, while more comprehensive than many competitors, still excludes dynamic content. Additionally, it does not provide suggestions for improvised medical tools, which is a critical gap for users in resource-constrained or remote environments.'),

      h2('2.2.3 ICE — In Case of Emergency Apps'),
      p('ICE (In Case of Emergency) applications are designed primarily to store and display critical medical information — such as allergies, blood type, medications, and emergency contacts — in a manner accessible to first responders and bystanders even when the device is locked. These applications serve an important but narrow purpose: they facilitate information transfer from the victim to the responder rather than guiding the responder on what actions to take.'),
      p('The fundamental limitation of ICE applications is their passive role. They assume that a trained responder will be present to interpret and act on the information provided. In situations where the first responder is an untrained bystander, which is the most common real-world scenario, ICE apps offer minimal actionable value. This gap underscores the need for a system that actively guides laypeople through emergency procedures with contextual intelligence.'),

      h1('2.3 Limitations and Weaknesses of Existing Systems'),
      p('A cross-analysis of the systems reviewed above reveals several recurring limitations that are directly relevant to the design of AidField:'),
      bul('Static, Non-Adaptive Content: All reviewed systems rely exclusively on pre-authored, static content. This fundamentally limits the ability to handle edge cases, unusual symptom combinations, or geographically specific hazards.'),
      bul('Limited or Absent Voice and Visual Input: None of the reviewed applications support voice-based query input or camera-based injury assessment, significantly limiting usability in high-stress emergencies.'),
      bul('Geographic and Contextual Narrowness: Most applications are developed primarily for Western, urban contexts and do not account for the resource realities faced by users in sub-Saharan Africa or rural environments.'),
      bul('Incomplete Offline Functionality: Partial offline support is insufficient in environments with inconsistent or expensive mobile data.'),
      bul('Lack of AI-Driven Intelligence: No reviewed application integrates a large language model capable of interpreting free-form natural language descriptions of emergencies.'),

      h1('2.4 How AidField Addresses These Weaknesses'),

      h2('2.4.1 Dynamic, AI-Powered Guidance'),
      p('AidField integrates the Google Gemini API to provide dynamic, context-sensitive guidance when internet connectivity is available. Users can describe their emergency in natural language — including ambiguous, multi-symptom, or unusual scenarios — and receive tailored, step-by-step guidance generated in real time. This eliminates the cognitive burden of self-categorisation and substantially expands the effective scope of the application beyond any fixed content library.'),

      h2('2.4.2 Voice and Visual Input'),
      p('AidField addresses the hands-free usability gap by integrating voice input through the device\'s native speech recognition capabilities via expo-speech-recognition. Users can verbally describe their emergency, and the transcription is processed by the AI tier for interpretation and guidance generation. Additionally, when online, users can submit camera images of injuries, wounds, rashes, or environmental hazards through the Visual Input feature, and the Gemini API\'s vision capabilities are leveraged to provide more accurate, visually informed guidance. Both features degrade gracefully when offline, directing users to the closest pre-cached scenario automatically.'),

      h2('2.4.3 Offline-First Architecture with Comprehensive Caching'),
      p('AidField is a downloadable native application, distributed through APK sideloading on Android and TestFlight on iOS. Upon installation, the application caches a curated library of fifty emergency scenarios using the device\'s local SQLite storage. This ensures that critical guidance is available instantly and without any internet dependency. The offline library includes improvised resource suggestions for each scenario, addressing the resource-constraint gap identified in the literature review.'),

      h2('2.4.4 Contextual and Geographic Adaptability'),
      p('The AI tier of AidField is capable of incorporating geographic and contextual information into its responses. When a user specifies their location or environmental context, the system can tailor guidance accordingly — referencing locally available resources, addressing region-specific hazards, or adjusting recommendations based on the described circumstances.'),

      h1('2.5 Chapter Summary'),
      p('This chapter has reviewed three related systems — the American Red Cross First Aid App, the St John Ambulance First Aid App, and ICE applications — identifying five recurring limitations in current first aid applications. These limitations informed the design decisions that distinguish AidField: dynamic AI-powered guidance using the Google Gemini API, voice and visual input for hands-free operation, comprehensive offline caching of 50 validated scenarios, and contextual adaptability for Kenyan users. Chapter Three presents the methodology adopted for the development of AidField.'),

      pageBreak(),

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER THREE: METHODOLOGY
// ═══════════════════════════════════════════════════════════════════════════════
      centered('CHAPTER THREE: METHODOLOGY', { bold: true, size: 28 }),
      blank(),

      h1('3.1 Introduction'),
      p('This chapter describes the research methodology and system development approach adopted for the design and implementation of AidField. It details the methodology selected, the justification for that selection, the data collection methods employed, and the tools and technologies used throughout the development lifecycle. The methodology is chosen to ensure that the system is developed systematically, iteratively, and in alignment with the project objectives outlined in Chapter One.'),

      h1('3.2 Methodology'),

      h2('3.2.1 Selected Methodology: Agile Iterative Development'),
      p('The Agile software development methodology, specifically the iterative and incremental model, has been selected for the development of AidField. Agile is a family of development frameworks characterised by short development cycles (sprints), continuous stakeholder feedback, adaptive planning, and a strong emphasis on working software (Beck et al., 2001). The development of AidField is organised into four primary iterations, each lasting approximately two to three weeks, producing a functional, testable increment of the system.'),

      h2('3.2.2 Justification for the Selected Methodology'),
      p('Several characteristics of AidField make the Agile iterative approach the most appropriate methodology. First, the integration of the Google Gemini API introduces a degree of unpredictability in output quality and response formatting that necessitates iterative testing and prompt refinement. A waterfall model would not accommodate the cycles of experimentation required to produce reliable, clinically appropriate AI outputs.'),
      p('Second, the user experience requirements of AidField are highly specialised — the application must be usable by a distressed, non-technical user under significant cognitive load. These requirements can only be validated through iterative usability testing with representative users, followed by design refinement. Third, the dual-tier architecture introduces inter-component dependencies best managed iteratively, allowing for modular debugging and independent validation of the offline and online tiers.'),

      h2('3.2.3 Development Iterations Overview'),
      p('The four planned iterations for AidField are structured as follows:'),
      num('Iteration 1 — Core Application Shell and Offline Library: Development of the foundational application structure, including the user interface framework, 3-tab navigation architecture (Search, Scenarios, Settings), and the offline emergency scenario library. This iteration produces a fully functional offline-only version of the application covering the fifty pre-cached emergency scenarios with step-by-step guidance and improvised resource suggestions.'),
      num('Iteration 2 — AI Integration and Online Tier: Integration of the Google Gemini API to enable dynamic, natural language emergency guidance. This iteration implements the online query interface, response parsing and formatting, the Visual Input feature (camera and gallery), and the fallback mechanism that directs users to the offline library when connectivity is unavailable.'),
      num('Iteration 3 — Voice Input and Text-to-Speech: Implementation of voice input using the device\'s native speech recognition API (expo-speech-recognition) and text-to-speech auto-readback of emergency steps (expo-speech). This iteration also implements the adjustable reading speed setting and the auto-read on scenario open feature.'),
      num('Iteration 4 — Usability Testing, Refinement, and Optimisation: Comprehensive usability testing with a representative user group, followed by interface refinements, performance optimisation, and preparation for APK distribution and TestFlight deployment.'),

      h1('3.3 Data Collection Methods and Tools'),

      h2('3.3.1 Primary Data Collection'),
      p('Primary data for this project is collected through two main methods: structured interviews and usability testing sessions.'),
      p('Structured interviews are conducted with a purposively selected sample of ten participants, including community health workers, first aid trainers, and laypersons with no formal medical training. The interviews focus on identifying the most common emergency scenarios encountered in the Kenyan context, the challenges users face when seeking first aid guidance under stress, and the features most valued in an emergency response tool.'),
      p('Usability testing is conducted during Iteration 4 using a think-aloud protocol, in which participants verbalise their thought processes while completing a set of predefined emergency response tasks using the application. A sample of fifteen participants, stratified by age, gender, and technical literacy, is recruited. Task completion rates, time-on-task, and error rates are the primary usability metrics.'),

      h2('3.3.2 Secondary Data Collection'),
      p('Secondary data is gathered through a systematic review of published literature on first aid protocols, emergency response mHealth applications, and offline-first mobile application architectures. Key sources include peer-reviewed journals in emergency medicine, medical informatics, and human-computer interaction, as well as technical documentation from the Google AI API, Google Play Developer documentation, and Apple Developer documentation.'),
      p('The content of the fifty pre-cached emergency scenarios is developed based on established first aid protocols from recognised authorities including the Kenya Red Cross, the World Health Organization, and the International Liaison Committee on Resuscitation (ILCOR).'),

      h2('3.3.3 Development Tools and Technologies'),
      tableCaption('Table 3.1: Development Tools and Technologies'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2800, 6226],
        rows: [
          hRow(['Tool / Technology', 'Role'], [2800, 6226]),
          dRow([{ text: 'React Native / Expo SDK 54' }, { text: 'Cross-platform mobile application framework enabling a single codebase deployable on Android and iOS' }], [2800, 6226], false),
          dRow([{ text: 'expo-sqlite v16' }, { text: 'Local on-device SQLite database for storing the 50-scenario offline library, steps, improvised resources, and user settings' }], [2800, 6226], true),
          dRow([{ text: 'Google Gemini API (gemini-2.5-flash)' }, { text: 'Online AI triage for text, voice, and visual image analysis via the generateContent endpoint' }], [2800, 6226], false),
          dRow([{ text: 'expo-speech-recognition' }, { text: 'Native Android and iOS speech recognition for hands-free voice input' }], [2800, 6226], true),
          dRow([{ text: 'expo-speech' }, { text: 'Text-to-speech engine for reading emergency steps aloud at adjustable speed' }], [2800, 6226], false),
          dRow([{ text: 'expo-image-picker' }, { text: 'Camera and gallery access for visual input and AI-assisted injury assessment' }], [2800, 6226], true),
          dRow([{ text: '@react-native-community/netinfo' }, { text: 'Real-time connectivity detection for routing between online AI tier and offline scenario library' }], [2800, 6226], false),
          dRow([{ text: 'React Navigation v7' }, { text: 'Stack and tab navigator for the 3-tab application navigation architecture' }], [2800, 6226], true),
          dRow([{ text: 'Axios' }, { text: 'HTTP client for Gemini API requests' }], [2800, 6226], false),
          dRow([{ text: 'Git and GitHub' }, { text: 'Version control and source code repository with branch-based development' }], [2800, 6226], true),
          dRow([{ text: 'Android Studio' }, { text: 'Android emulator and APK build environment' }], [2800, 6226], false),
          dRow([{ text: 'Visual Studio Code' }, { text: 'Primary code editor' }], [2800, 6226], true),
        ],
      }),
      blank(),

      h1('3.4 Chapter Summary'),
      p('This chapter has described the Agile iterative methodology selected for the development of AidField, justifying the selection on the basis of AI integration complexity, high-stakes usability requirements, and modular architecture. The four planned development iterations were outlined, and the primary and secondary data collection methods documented. Section 3.3.3 presented the full toolchain, including the Google Gemini API for AI triage, expo-speech-recognition for voice input, expo-speech for TTS readback, and expo-image-picker for visual input. Chapter Four presents the system analysis, including the functional and non-functional requirements derived from the needs assessment.'),

      pageBreak(),

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER FOUR: SYSTEM ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
      centered('CHAPTER FOUR: SYSTEM ANALYSIS', { bold: true, size: 28 }),
      blank(),

      h1('4.1 Introduction'),
      p('This chapter presents the system analysis for AidField. It begins with an analysis of the current system — the fragmented, connectivity-dependent approaches bystanders rely on in emergencies — before defining the proposed system and deriving the functional and non-functional requirements. The requirements are prioritised using the MoSCoW framework (Must Have, Should Have, Could Have, Won\'t Have) to guide implementation across the four development iterations.'),

      h1('4.2 Analysis of the Current System'),

      h2('4.2.1 Current System Overview'),
      p('Without AidField, a bystander in a medical emergency follows a fragmented process that depends heavily on internet connectivity and prior knowledge. The typical flow involves recognising the emergency, attempting to recall first aid knowledge from memory or past training, seeking guidance online through search engines or websites, or calling a friend or relative for advice. Each of these steps introduces delay and uncertainty at precisely the moment when speed and accuracy are most critical.'),

      h2('4.2.2 Weaknesses of the Current System'),
      bul('All online first aid resources fail when the device has no internet connectivity.'),
      bul('Search engines return unfiltered results of varying clinical quality.'),
      bul('No existing solution provides improvised resource substitutes for households without a medical kit.'),
      bul('No existing solution supports hands-free voice or visual input for users who cannot type during an emergency.'),
      bul('Standard first aid guides are written for Western contexts and assume access to specific medical supplies not commonly available in rural Kenya.'),

      h1('4.3 Proposed System Requirements'),

      h2('4.3.1 Functional Requirements'),
      tableCaption('Table 4.1: Functional Requirements (MoSCoW)'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [700, 1500, 4826, 2000],
        rows: [
          hRow(['FR ID', 'Priority', 'Requirement', 'Module'], [700, 1500, 4826, 2000]),
          dRow([{ text: 'FR01' }, { text: 'Must Have', center: true }, { text: 'The system shall cache a library of 50 emergency scenario guides into SQLite on first application launch.' }, { text: 'Offline Library' }], [700, 1500, 4826, 2000], false),
          dRow([{ text: 'FR02' }, { text: 'Must Have', center: true }, { text: 'Each scenario shall include a title, urgency level (red/amber/green), summary, numbered step-by-step instructions in English and Swahili, and a list of improvised resource substitutes.' }, { text: 'Offline Library' }], [700, 1500, 4826, 2000], true),
          dRow([{ text: 'FR03' }, { text: 'Must Have', center: true }, { text: 'The system shall route user text queries to the closest matching offline scenario via keyword matching and a decision tree when the device is offline.' }, { text: 'Offline Routing' }], [700, 1500, 4826, 2000], false),
          dRow([{ text: 'FR04' }, { text: 'Must Have', center: true }, { text: 'The system shall display a clear offline indicator and route queries to the offline scenario browser when connectivity is unavailable.' }, { text: 'Offline Routing' }], [700, 1500, 4826, 2000], true),
          dRow([{ text: 'FR05' }, { text: 'Must Have', center: true }, { text: 'When online, the system shall submit the user\'s emergency description to the Google Gemini API and display an AI-generated response.' }, { text: 'AI Triage' }], [700, 1500, 4826, 2000], false),
          dRow([{ text: 'FR06' }, { text: 'Must Have', center: true }, { text: 'The AI response shall include: urgency level (LIFE-THREATENING / URGENT / MODERATE), an immediate action, numbered steps, improvised resource substitutes, and a call note.' }, { text: 'AI Triage' }], [700, 1500, 4826, 2000], true),
          dRow([{ text: 'FR07' }, { text: 'Must Have', center: true }, { text: 'The system shall capture voice input using the device\'s native speech recognition API and use the transcript as the emergency query.' }, { text: 'Voice Input' }], [700, 1500, 4826, 2000], false),
          dRow([{ text: 'FR08' }, { text: 'Must Have', center: true }, { text: 'When offline, voice queries shall be routed to the offline scenario browser. When online, voice queries shall be sent to the Gemini API.' }, { text: 'Voice Input' }], [700, 1500, 4826, 2000], true),
          dRow([{ text: 'FR09' }, { text: 'Must Have', center: true }, { text: 'The system shall read emergency steps aloud using text-to-speech at a user-adjustable speed (Slow / Normal / Fast), with the option to auto-read on scenario open.' }, { text: 'Speech Output' }], [700, 1500, 4826, 2000], false),
          dRow([{ text: 'FR10' }, { text: 'Must Have', center: true }, { text: 'When online, the system shall allow the user to capture or select an image and submit it to the Gemini Vision API for AI-assisted injury assessment.' }, { text: 'Visual Input' }], [700, 1500, 4826, 2000], true),
          dRow([{ text: 'FR11' }, { text: 'Must Have', center: true }, { text: 'When offline and the user captures a photo via Visual Input, the photo shall be saved to the device gallery and the user notified that AI analysis requires connectivity.' }, { text: 'Visual Input' }], [700, 1500, 4826, 2000], false),
          dRow([{ text: 'FR12' }, { text: 'Must Have', center: true }, { text: 'The system shall provide one-tap dialling of Kenya emergency numbers: 999, 112, and Kenya Red Cross 0800 723 999, with a confirmation dialog before dialling.' }, { text: 'Emergency Calls' }], [700, 1500, 4826, 2000], true),
          dRow([{ text: 'FR13' }, { text: 'Must Have', center: true }, { text: 'The system shall display all step-by-step instructions in either English or Swahili based on the user\'s language preference, toggleable per scenario and persistable in settings.' }, { text: 'Localisation' }], [700, 1500, 4826, 2000], false),
          dRow([{ text: 'FR14' }, { text: 'Must Have', center: true }, { text: 'The system shall detect online/offline status in real time and update the connectivity indicator and available features accordingly.' }, { text: 'Connectivity' }], [700, 1500, 4826, 2000], true),
          dRow([{ text: 'FR15' }, { text: 'Should Have', center: true }, { text: 'The system shall persist user preferences (language, TTS enabled, reading speed) in the local SQLite database across sessions.' }, { text: 'Settings' }], [700, 1500, 4826, 2000], false),
        ],
      }),
      blank(),

      h2('4.3.2 Non-Functional Requirements'),
      tableCaption('Table 4.2: Non-Functional Requirements'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [700, 1800, 6526],
        rows: [
          hRow(['NFR ID', 'Category', 'Requirement'], [700, 1800, 6526]),
          dRow([{ text: 'NFR01' }, { text: 'Performance' }, { text: 'Offline scenario content shall load in 1 second or less from the moment the user taps a scenario card.' }], [700, 1800, 6526], false),
          dRow([{ text: 'NFR02' }, { text: 'Performance' }, { text: 'The AI response shall be returned and rendered within 5 seconds on a 4G LTE connection under normal network load.' }], [700, 1800, 6526], true),
          dRow([{ text: 'NFR03' }, { text: 'Reliability' }, { text: 'The application shall produce zero crashes or data errors across 50 consecutive offline test runs on the target devices.' }], [700, 1800, 6526], false),
          dRow([{ text: 'NFR04' }, { text: 'Reliability' }, { text: 'The application shall detect a change in connectivity and update the UI within 2 seconds of the change occurring.' }], [700, 1800, 6526], true),
          dRow([{ text: 'NFR05' }, { text: 'Accuracy' }, { text: 'The AI triage module shall return a Correct or Partially Correct response for at least 90% of 50 standardised test emergency descriptions.' }], [700, 1800, 6526], false),
          dRow([{ text: 'NFR06' }, { text: 'Security' }, { text: 'No personally identifiable information shall be transmitted to the Gemini API. Only anonymised emergency descriptions are sent.' }], [700, 1800, 6526], true),
          dRow([{ text: 'NFR07' }, { text: 'Portability' }, { text: 'The application shall run on Android 8.0 (API 26) and above, and iOS 14 and above. The APK file size shall not exceed 50 MB.' }], [700, 1800, 6526], false),
          dRow([{ text: 'NFR08' }, { text: 'Usability' }, { text: 'Every critical first aid action shall be reachable within 3 taps from the home screen. The System Usability Scale (SUS) score shall be 68 or above.' }], [700, 1800, 6526], true),
        ],
      }),
      blank(),

      h1('4.4 Use Case Analysis'),

      h2('4.4.1 Actors'),
      p('The primary actor in the AidField system is the Bystander — a non-medical lay person who is present at the scene of a medical emergency. No secondary actors or administrative users are defined, as the system requires no back-end management interface. The Google Gemini API is treated as an external system actor that provides AI responses when queried.'),

      h2('4.4.2 Use Case Summary'),
      tableCaption('Table 4.3: Use Case Summary'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [700, 2500, 1800, 4026],
        rows: [
          hRow(['UC ID', 'Use Case', 'Availability', 'Description'], [700, 2500, 1800, 4026]),
          dRow([{ text: 'UC01' }, { text: 'Browse emergency categories' }, { text: 'Offline', center: true }, { text: 'User navigates the 11-category scenario browser on the Scenarios tab.' }], [700, 2500, 1800, 4026], false),
          dRow([{ text: 'UC02' }, { text: 'View step-by-step scenario' }, { text: 'Offline', center: true }, { text: 'User opens a scenario and reads numbered steps in English or Swahili.' }], [700, 2500, 1800, 4026], true),
          dRow([{ text: 'UC03' }, { text: 'Get improvised resource tips' }, { text: 'Offline', center: true }, { text: 'User expands the Improvised Resources accordion on a scenario.' }], [700, 2500, 1800, 4026], false),
          dRow([{ text: 'UC04' }, { text: 'One-tap emergency dial' }, { text: 'Offline', center: true }, { text: 'User taps the emergency banner to dial 999, 112, or Red Cross.' }], [700, 2500, 1800, 4026], true),
          dRow([{ text: 'UC05' }, { text: 'Keyword search offline' }, { text: 'Offline', center: true }, { text: 'User types a query which is matched against scenario keywords and routed to the Scenarios tab.' }], [700, 2500, 1800, 4026], false),
          dRow([{ text: 'UC06' }, { text: 'Auto-read steps aloud (TTS)' }, { text: 'Offline', center: true }, { text: 'Steps are read aloud automatically on scenario open when TTS is enabled in Settings.' }], [700, 2500, 1800, 4026], true),
          dRow([{ text: 'UC07' }, { text: 'AI triage — text description' }, { text: 'Online', center: true }, { text: 'User types an emergency description and receives Gemini AI guidance.' }], [700, 2500, 1800, 4026], false),
          dRow([{ text: 'UC08' }, { text: 'Voice input to AI guidance' }, { text: 'Online', center: true }, { text: 'User speaks the emergency; transcript is sent to Gemini for guidance.' }], [700, 2500, 1800, 4026], true),
          dRow([{ text: 'UC09' }, { text: 'Visual input — camera or gallery' }, { text: 'Online', center: true }, { text: 'User captures or selects an image; Gemini Vision API returns injury-specific guidance.' }], [700, 2500, 1800, 4026], false),
          dRow([{ text: 'UC10' }, { text: 'Toggle language' }, { text: 'Offline', center: true }, { text: 'User switches scenario display between English and Swahili.' }], [700, 2500, 1800, 4026], true),
          dRow([{ text: 'UC11' }, { text: 'Adjust reading speed' }, { text: 'Offline', center: true }, { text: 'User selects Slow, Normal, or Fast TTS reading speed in Settings.' }], [700, 2500, 1800, 4026], false),
        ],
      }),
      blank(),

      h1('4.5 Algorithm Design'),

      h2('4.5.1 Offline Scenario Routing Algorithm'),
      p('When the user submits a query while offline, the following algorithm is applied:'),
      num('Normalise the query string to lowercase and remove common stop words.'),
      num('Tokenise the normalised query into individual keywords.'),
      num('For each scenario in the SQLite database, compute a keyword match score by counting how many query tokens appear in the scenario\'s keywords field.'),
      num('If the highest-scoring scenario has a match score of 2 or more keywords, return that scenario as the top result.'),
      num('If no scenario scores 2 or more, activate a 6-node decision tree with binary questions: Is the person conscious? Is there bleeding? Is the person breathing? Is there a foreign object? Is there a burn? Is the person having a seizure?'),
      num('Navigate the user to the Scenarios tab with the matched results displayed.'),

      h2('4.5.2 Two-Tier Connectivity Controller'),
      p('The connectivity controller operates as follows:'),
      num('On every user interaction that requires connectivity, call isOnline() which queries NetInfo for isConnected and isInternetReachable.'),
      num('If both are true: route the query to the Gemini API tier.'),
      num('If either is false: route the query to the offline scenario matcher.'),
      num('On API error (HTTP 429, 503, or network timeout): display an error message and automatically fall back to the offline scenario browser.'),
      num('Update the connectivity indicator dot on the Home screen in real time as connectivity state changes.'),

      h2('4.5.3 AI Response Format'),
      p('All Gemini API requests use a structured system prompt that instructs the model to respond in the following fixed format:'),
      bul('URGENCY: [LIFE-THREATENING / URGENT / MODERATE]'),
      bul('IMMEDIATE ACTION: [One sentence on what to do right now]'),
      bul('STEPS: [Numbered list, maximum 6 steps, one sentence each]'),
      bul('IMPROVISED RESOURCES: [Dash-separated list of standard item: household substitute]'),
      bul('CALL: [One sentence on when to call 999 or 112]'),
      p('The parseAIResponse() function uses regular expressions to extract each section into a structured JavaScript object, which is rendered by the HomeScreen component into a formatted AI guidance card.'),

      h1('4.6 Chapter Summary'),
      p('This chapter has presented the system analysis for AidField, including the analysis of the current emergency response system and its weaknesses, the derivation of 15 functional requirements and 8 non-functional requirements using the MoSCoW framework, a use case summary covering 11 distinct user interactions, and the algorithm design for offline routing, connectivity control, and AI response formatting. Chapter Five presents the system design, translating these requirements into a concrete architecture, database schema, user interface design, and API integration plan.'),

      pageBreak(),

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER FIVE: SYSTEM DESIGN
// ═══════════════════════════════════════════════════════════════════════════════
      centered('CHAPTER FIVE: SYSTEM DESIGN', { bold: true, size: 28 }),
      blank(),

      h1('5.1 Introduction'),
      p('This chapter presents the system design for AidField, translating the requirements defined in Chapter Four into a concrete technical architecture. It covers the high-level system architecture, database design, user interface design, navigation architecture, and API integration design. The design prioritises offline reliability, minimum-tap access to critical guidance, and graceful degradation from the online AI tier to the offline scenario library.'),

      h1('5.2 System Architecture'),

      h2('5.2.1 High-Level Architecture'),
      p('AidField follows a client-centric, offline-first architecture in which all core functionality resides on the device. The Google Gemini API is an optional enhancement layer that is activated only when internet connectivity is confirmed. The system is composed of five layers:'),
      bul('Presentation Layer: The React Native user interface, comprising six screens — HomeScreen (Search tab), ScenariosScreen, CategoryScreen, ScenarioScreen, SettingsScreen, and EmergencyScreen — organised into a 3-tab navigation structure.'),
      bul('Connectivity Layer: The NetInfo API module that polls connectivity every two seconds and on every user interaction, routing requests to the appropriate tier.'),
      bul('Offline Tier (Always Available): The SQLite database containing 50 emergency scenarios, the keyword index, the decision tree engine, the improvised resources database, and the Swahili translation store.'),
      bul('Online Tier (When Connected): The Google Gemini API integration providing text triage, voice transcript interpretation, and visual image analysis.'),
      bul('Device Hardware Layer: The physical device components accessed via native APIs — microphone (speech recognition), camera (visual input), speaker (TTS), and local storage (SQLite).'),

      h2('5.2.2 Dual-Tier Design Rationale'),
      p('The dual-tier architecture is the central design decision of AidField. It ensures that the application delivers actionable guidance in all connectivity states. The offline tier is the primary tier — it is always available and requires no configuration. The online tier is secondary — it enhances the guidance quality when available but its absence never renders the application non-functional.'),

      h1('5.3 Database Design'),

      h2('5.3.1 Database Overview'),
      p('AidField uses a single SQLite database file stored in the device\'s application data directory. The database is initialised on first launch and contains five tables. All data is stored locally — no cloud database is used at any point in the system.'),

      h2('5.3.2 Database Schema'),
      tableCaption('Table 5.1: Database Schema'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [1800, 2200, 1200, 3826],
        rows: [
          hRow(['Table', 'Column', 'Data Type', 'Description'], [1800, 2200, 1200, 3826]),
          dRow([{ text: 'categories' }, { text: 'category_id (PK)' }, { text: 'INTEGER', center: true }, { text: 'Auto-incrementing primary key' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: '' }, { text: 'category_name' }, { text: 'TEXT', center: true }, { text: 'Display name of the emergency category' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: '' }, { text: 'icon_name' }, { text: 'TEXT', center: true }, { text: 'Ionicons icon name for the category' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: '' }, { text: 'urgency_color' }, { text: 'TEXT', center: true }, { text: 'Hex colour code representing the category urgency level' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: '' }, { text: 'description' }, { text: 'TEXT', center: true }, { text: 'Short description shown on the category card' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: 'scenarios' }, { text: 'scenario_id (PK)' }, { text: 'INTEGER', center: true }, { text: 'Auto-incrementing primary key' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: '' }, { text: 'category_id (FK)' }, { text: 'INTEGER', center: true }, { text: 'Foreign key referencing categories.category_id' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: '' }, { text: 'title' }, { text: 'TEXT', center: true }, { text: 'Scenario display title' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: '' }, { text: 'keywords' }, { text: 'TEXT', center: true }, { text: 'Comma-separated keywords used for offline routing' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: '' }, { text: 'urgency_level' }, { text: 'TEXT', center: true }, { text: 'One of: red, amber, or green' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: '' }, { text: 'summary' }, { text: 'TEXT', center: true }, { text: 'One-sentence summary shown on scenario and search cards' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: 'steps' }, { text: 'step_id (PK)' }, { text: 'INTEGER', center: true }, { text: 'Auto-incrementing primary key' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: '' }, { text: 'scenario_id (FK)' }, { text: 'INTEGER', center: true }, { text: 'Foreign key referencing scenarios.scenario_id' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: '' }, { text: 'step_number' }, { text: 'INTEGER', center: true }, { text: 'Sequential step number within the scenario' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: '' }, { text: 'instruction' }, { text: 'TEXT', center: true }, { text: 'Step instruction in English' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: '' }, { text: 'instruction_sw' }, { text: 'TEXT', center: true }, { text: 'Step instruction in Swahili' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: 'imp_resources' }, { text: 'resource_id (PK)' }, { text: 'INTEGER', center: true }, { text: 'Auto-incrementing primary key' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: '' }, { text: 'scenario_id (FK)' }, { text: 'INTEGER', center: true }, { text: 'Foreign key referencing scenarios.scenario_id' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: '' }, { text: 'standard_item' }, { text: 'TEXT', center: true }, { text: 'Standard medical supply item name' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: '' }, { text: 'substitutes' }, { text: 'TEXT', center: true }, { text: 'Household substitute suggestions' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: '' }, { text: 'notes' }, { text: 'TEXT', center: true }, { text: 'Additional usage notes for the substitute' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: 'user_settings' }, { text: 'setting_id (PK)' }, { text: 'INTEGER', center: true }, { text: 'Auto-incrementing primary key' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: '' }, { text: 'language' }, { text: 'TEXT', center: true }, { text: 'User\'s preferred language: en or sw' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: '' }, { text: 'tts_enabled' }, { text: 'INTEGER', center: true }, { text: '1 if Read Steps Aloud is enabled, 0 if disabled' }], [1800, 2200, 1200, 3826], true),
          dRow([{ text: '' }, { text: 'tts_speed' }, { text: 'REAL', center: true }, { text: 'TTS reading speed: 0.6 (Slow), 0.85 (Normal), or 1.1 (Fast)' }], [1800, 2200, 1200, 3826], false),
          dRow([{ text: '' }, { text: 'last_scenario' }, { text: 'INTEGER', center: true }, { text: 'FK to the last scenario the user viewed' }], [1800, 2200, 1200, 3826], true),
        ],
      }),
      blank(),

      h2('5.3.3 Entity Relationships'),
      p('The five tables are related as follows: the categories table has a one-to-many relationship with the scenarios table (one category contains many scenarios). The scenarios table has a one-to-many relationship with both the steps table and the imp_resources table (one scenario has many steps and many improvised resources). The user_settings table is independent and stores a single row of user preferences.'),

      h1('5.4 User Interface Design'),

      h2('5.4.1 Navigation Architecture'),
      p('AidField uses a 3-tab bottom navigation structure implemented with React Navigation\'s createBottomTabNavigator. Each tab hosts a nested stack navigator. The three tabs are: Search (the Home tab), Scenarios, and Settings. The tab bar height adapts dynamically to the device\'s system navigation bar inset using the useSafeAreaInsets hook to ensure the tab bar is always visible above the phone\'s system navigation buttons.'),

      h2('5.4.2 Screen Designs'),

      h3('5.4.2.1 Home Screen (Search Tab)'),
      p('The Home screen is the primary point of interaction and is designed for maximum speed under stress. It contains the following elements from top to bottom: a dark navigation header showing the AidField name, subtitle, and real-time connectivity indicator dot; a full-width red emergency call card with a Call 999 / 112 button; a text search bar for typing emergency descriptions; a Quick Actions row containing a Visual Input card (camera or gallery, online only) and a Voice Search card (microphone with pulse animation); a contextual Ask AI button (green when online, dark when offline); a Critical Emergencies list showing the six most common life-threatening scenarios as quick-access cards; and the AI guidance result card when an AI query has been processed.'),

      h3('5.4.2.2 Scenarios Screen'),
      p('The Scenarios screen displays all eleven emergency categories as colour-coded cards with icons, descriptions, and left border colours indicating urgency. Tapping a category navigates to the CategoryScreen. When navigated from the Home screen with offline search results, the Scenarios screen displays the matched results instead of the category list, with a Clear button to return to the full category view.'),

      h3('5.4.2.3 Category Screen'),
      p('The Category screen displays all scenarios within a selected emergency category. Each scenario card shows the title, summary, and an urgency badge (LIFE-THREATENING, URGENT, or MODERATE). Tapping a scenario navigates to the ScenarioScreen.'),

      h3('5.4.2.4 Scenario Screen'),
      p('The Scenario screen is the core guidance screen. It displays the scenario title in the header, a summary card with urgency colour coding, a Read Aloud button and Language toggle (English / Swahili) in a controls row, numbered step cards that highlight the active step during TTS playback, and an Improvised Resources accordion that expands to show standard items and their household substitutes. The emergency call banner is always visible at the top. When Read Steps Aloud is enabled in Settings, steps begin reading automatically when the screen opens.'),

      h3('5.4.2.5 Settings Screen'),
      p('The Settings screen provides: a Language selector (English / Kiswahili toggle buttons); a Read Steps Aloud switch that persists TTS preference to the database; a Reading Speed selector (Slow / Normal / Fast buttons); an Emergency Contacts shortcut card; and an About section showing version, region, scenario count, and AI model information. A disclaimer note clarifies that AidField is a supplement to, not a replacement for, professional medical care.'),

      h3('5.4.2.6 Emergency Screen'),
      p('The Emergency screen displays all Kenya emergency contacts as tappable cards: 999, 112, Kenya Red Cross (0800 723 999), Nairobi Hospital, Kenyatta National Hospital, Aga Khan Hospital, St John Ambulance Kenya, and Poison Control. The two primary numbers (999 and 112) are displayed as large priority buttons at the top. Tapping any contact shows a confirmation dialog before opening the native phone dialler.'),

      h2('5.4.3 Design Principles'),
      p('The user interface is designed according to four principles derived from emergency HCI research:'),
      bul('Minimum taps: Every critical action is reachable within 3 taps from the Home screen.'),
      bul('High contrast: Dark headers, large text, colour-coded urgency indicators, and white card backgrounds ensure readability in varied lighting conditions.'),
      bul('Hands-free priority: Voice input and TTS readback allow users to receive guidance without touching the screen after the initial query.'),
      bul('Always-on emergency access: The emergency call banner and one-tap dial are present on every screen.'),

      h1('5.5 API Integration Design'),

      h2('5.5.1 Request Modes'),
      tableCaption('Table 5.2: Gemini API Request Modes'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [1600, 2400, 5026],
        rows: [
          hRow(['Mode', 'Endpoint', 'Request Body Structure'], [1600, 2400, 5026]),
          dRow([{ text: 'Text Query' }, { text: 'POST /v1beta/models/gemini-2.5-flash:generateContent' }, { text: 'contents: [{parts: [{text: SYSTEM_PROMPT + userMessage}]}], generationConfig: {maxOutputTokens: 2048, temperature: 0.3}' }], [1600, 2400, 5026], false),
          dRow([{ text: 'Voice Query' }, { text: 'POST /v1beta/models/gemini-2.5-flash:generateContent' }, { text: 'Identical to text query. The expo-speech-recognition transcript is passed directly as userMessage.' }], [1600, 2400, 5026], true),
          dRow([{ text: 'Visual + Text' }, { text: 'POST /v1beta/models/gemini-2.5-flash:generateContent' }, { text: 'contents: [{parts: [{inline_data: {mime_type: image/jpeg, data: base64String}}, {text: SYSTEM_PROMPT + userMessage}]}]' }], [1600, 2400, 5026], false),
        ],
      }),
      blank(),

      h2('5.5.2 Response Parsing'),
      p('All Gemini API responses are processed by the parseAIResponse() function in claudeService.js, which uses regular expressions to extract the five structured sections: urgency, immediate action, steps array, improvised resources array, and call note. The cleanMarkdown() function is applied before parsing to strip any residual asterisks, hashes, or other markdown formatting characters from the response. The resulting parsed object is rendered by the HomeScreen component into the AI guidance card.'),

      h2('5.5.3 Error Handling'),
      p('The following error states are handled:'),
      bul('HTTP 429 (rate limit exceeded): Error card displayed with message. Automatic fallback to offline scenario browser.'),
      bul('HTTP 503 (server unavailable): Same as 429 handling.'),
      bul('Network timeout: Same as 429 handling.'),
      bul('Invalid or empty response: Error card displayed. User directed to use text search or browse scenarios.'),

      h1('5.6 Chapter Summary'),
      p('This chapter has presented the complete system design for AidField, covering the five-layer architecture, the 5-table SQLite schema including the tts_speed field in user_settings, the navigation architecture with its 3-tab structure (Search, Scenarios, Settings), the design of all six screens, four interface design principles, and the three Gemini API request modes with their error handling strategy. Chapter Six presents the implementation and testing of the designed system.'),

      pageBreak(),

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER SIX: IMPLEMENTATION AND TESTING
// ═══════════════════════════════════════════════════════════════════════════════
      centered('CHAPTER SIX: IMPLEMENTATION AND TESTING', { bold: true, size: 28 }),
      blank(),

      h1('6.1 Introduction'),
      p('This chapter describes the implementation of AidField and the testing procedures carried out to validate its functional and non-functional requirements. Section 6.2 details the development environment. Section 6.3 describes the implemented system components. Section 6.4 presents the test plan, including test data, test cases, and test results for the functional and non-functional requirements defined in Chapter Four.'),
      p('The implementation follows the Agile iterative methodology described in Chapter Three, progressing through four development sprints. The final system integrates a React Native mobile frontend built with Expo SDK 54, a locally stored SQLite database, a real-time connectivity detection module, and an online AI triage tier powered by the Google Gemini API (gemini-2.5-flash model).'),

      h1('6.2 Development Environment'),

      h2('6.2.1 Hardware Environment'),
      tableCaption('Table 6.1: Hardware Specifications'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2200, 1800, 3026, 2000],
        rows: [
          hRow(['Device', 'Role', 'Specifications', 'OS Version'], [2200, 1800, 3026, 2000]),
          dRow([{ text: 'Development Laptop' }, { text: 'Development Machine' }, { text: 'Intel Core i5, 8 GB RAM, Windows 10 Build 22000' }, { text: 'Windows 10' }], [2200, 1800, 3026, 2000], false),
          dRow([{ text: 'Android Emulator (Pixel 6)' }, { text: 'Primary Test Device' }, { text: 'Virtual device — Android API 33 (Android 13)' }, { text: 'Android 13' }], [2200, 1800, 3026, 2000], true),
          dRow([{ text: 'Infinix Note 30 Pro' }, { text: 'Physical Target Device' }, { text: '6.78" display, 8 GB RAM, MediaTek Helio G99' }, { text: 'Android 13' }], [2200, 1800, 3026, 2000], false),
        ],
      }),
      blank(),

      h2('6.2.2 Software Environment'),
      tableCaption('Table 6.2: Software Tools and Framework Versions'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2800, 1400, 4826],
        rows: [
          hRow(['Tool / Framework', 'Version', 'Role'], [2800, 1400, 4826]),
          dRow([{ text: 'React Native' }, { text: '0.76+', center: true }, { text: 'Cross-platform mobile framework' }], [2800, 1400, 4826], false),
          dRow([{ text: 'Expo SDK' }, { text: '54.0.0', center: true }, { text: 'Managed workflow providing native device API access' }], [2800, 1400, 4826], true),
          dRow([{ text: 'expo-sqlite' }, { text: '16.0.10', center: true }, { text: 'Local SQLite database for offline scenario storage' }], [2800, 1400, 4826], false),
          dRow([{ text: 'expo-speech' }, { text: '14.0.8', center: true }, { text: 'Text-to-speech engine for hands-free step readback' }], [2800, 1400, 4826], true),
          dRow([{ text: 'expo-speech-recognition' }, { text: '3.1.3', center: true }, { text: 'Native speech recognition for voice input' }], [2800, 1400, 4826], false),
          dRow([{ text: 'expo-image-picker' }, { text: '17.0.11', center: true }, { text: 'Camera and gallery access for visual input' }], [2800, 1400, 4826], true),
          dRow([{ text: 'React Navigation' }, { text: '7.x', center: true }, { text: '3-tab and stack navigation framework' }], [2800, 1400, 4826], false),
          dRow([{ text: '@react-native-community/netinfo' }, { text: '11.4.1', center: true }, { text: 'Real-time connectivity detection' }], [2800, 1400, 4826], true),
          dRow([{ text: 'Axios' }, { text: '1.x', center: true }, { text: 'HTTP client for Gemini API requests' }], [2800, 1400, 4826], false),
          dRow([{ text: 'Google Gemini API' }, { text: 'gemini-2.5-flash', center: true }, { text: 'Online AI triage — text, voice, and visual analysis' }], [2800, 1400, 4826], true),
          dRow([{ text: 'Node.js' }, { text: '18+', center: true }, { text: 'JavaScript runtime' }], [2800, 1400, 4826], false),
          dRow([{ text: 'Android Studio' }, { text: '2023.x', center: true }, { text: 'Android emulator and APK build environment' }], [2800, 1400, 4826], true),
          dRow([{ text: 'Visual Studio Code' }, { text: '1.x', center: true }, { text: 'Primary code editor' }], [2800, 1400, 4826], false),
          dRow([{ text: 'Git / GitHub' }, { text: '-', center: true }, { text: 'Version control' }], [2800, 1400, 4826], true),
        ],
      }),
      blank(),

      h2('6.2.3 Project Structure'),
      p('The AidField project is organised into the following directory structure:'),
      bul('src/database/ — SQLite initialisation, schema creation, 50-scenario data seeding, and all query helper functions (getCategories, getScenariosByCategory, getScenarioById, getStepsByScenario, getResourcesByScenario, getSettings, updateSettings, searchScenarios)'),
      bul('src/screens/ — HomeScreen, ScenariosScreen, CategoryScreen, ScenarioScreen, SettingsScreen, EmergencyScreen'),
      bul('src/navigation/ — AppNavigator defining the root bottom tab navigator and three nested stack navigators'),
      bul('src/services/ — claudeService.js (Gemini API requests, cleanMarkdown, parseAIResponse) and connectivityService.js (NetInfo isOnline wrapper)'),
      bul('src/constants/ — colors.js, typography.js, layout.js, and index.js aggregating all design tokens'),
      bul('App.js — Root component that initialises the database on first launch before rendering the navigation container'),

      h2('6.2.4 Back-End Configuration'),
      tableCaption('Table 6.3: Gemini API Configuration'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2800, 6226],
        rows: [
          hRow(['Parameter', 'Value'], [2800, 6226]),
          dRow([{ text: 'API Provider' }, { text: 'Google AI (Gemini API)' }], [2800, 6226], false),
          dRow([{ text: 'Model' }, { text: 'gemini-2.5-flash (primary) with gemini-2.0-flash as fallback' }], [2800, 6226], true),
          dRow([{ text: 'Endpoint' }, { text: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent' }], [2800, 6226], false),
          dRow([{ text: 'Authentication' }, { text: 'API key passed as URL query parameter (?key=API_KEY)' }], [2800, 6226], true),
          dRow([{ text: 'Max Output Tokens' }, { text: '2048 tokens per request' }], [2800, 6226], false),
          dRow([{ text: 'Temperature' }, { text: '0.3 (low temperature for consistent, factual emergency guidance)' }], [2800, 6226], true),
          dRow([{ text: 'API Key Storage' }, { text: 'Stored in claudeService.js during development; to be moved to secure environment variable for production release' }], [2800, 6226], false),
          dRow([{ text: 'Error Handling' }, { text: 'HTTP 429, 503, and network timeouts trigger automatic fallback to offline scenario library' }], [2800, 6226], true),
        ],
      }),
      blank(),

      h1('6.3 System Components as Implemented'),

      h2('6.3.1 Offline Scenario Library'),
      p('The offline scenario library is seeded on first application launch by the initDB() function in db.js. The library comprises 50 emergency scenarios distributed across 11 categories, stored in the scenarios, steps, and imp_resources tables. Each scenario includes keyword strings used for offline routing, urgency classification, step-by-step instructions in both English and Swahili, and improvised resource substitutes. Old database versions are automatically deleted on launch to prevent stale data accumulation.'),

      h2('6.3.2 AI Triage Module'),
      p('The AI triage module is implemented in claudeService.js. Text and voice queries use a single-part request body combining the system prompt and user message. Visual queries use a two-part request body combining a base64-encoded JPEG image and the user message. The cleanMarkdown() function strips markdown formatting before parseAIResponse() extracts the structured sections. On API errors, the module throws the error, which is caught by the HomeScreen component and triggers the offline fallback navigation.'),

      h2('6.3.3 Text-to-Speech and Reading Speed'),
      p('The speakSteps() function in ScenarioScreen.js iterates sequentially through the steps array, speaking each step as a Promise resolved by onDone, onError, or onStopped callbacks. A React useRef (stopRequested) signals early termination when the user taps Stop, preventing the loop from advancing to the next step. The reading speed (0.6, 0.85, or 1.1) is loaded from user_settings on each scenario open and applied to the rate parameter of each Speech.speak() call.'),

      h2('6.3.4 Visual Input'),
      p('The Visual Input component presents a styled bottom-sheet modal with Camera and Gallery options. When Camera is selected and the device is online, expo-image-picker launches the device camera with saveToPhotos: true, ensuring simultaneous gallery save and AI analysis. When offline, the photo is saved to the gallery and the user is notified that AI analysis will be available when connectivity is restored. Gallery selection follows the same online/offline logic.'),

      h2('6.3.5 Navigation and Safe Area'),
      p('The tab bar bottom padding is dynamically calculated using useSafeAreaInsets() from react-native-safe-area-context, adding the device\'s bottom inset to the tab bar height. This ensures the tab bar remains above the system navigation buttons on all Android devices, including those with 3-button navigation bars, regardless of screen size.'),

      h1('6.4 Test Plan'),

      h2('6.4.1 Test Objectives'),
      bul('Verify that all Must Have functional requirements are correctly implemented and behave as specified under both online and offline conditions.'),
      bul('Validate that the application degrades gracefully when connectivity is lost, with no crash or data loss.'),
      bul('Confirm that the offline scenario library loads correctly and contains all 50 scenarios accessible through all entry points.'),
      bul('Verify that the Gemini API integration returns structured, formatted responses and handles error states correctly.'),
      bul('Validate that text-to-speech reads all steps in sequence and stops cleanly on demand.'),
      bul('Confirm that voice input captures speech correctly and routes to the appropriate tier.'),
      bul('Assess application performance against the non-functional targets specified in Section 4.3.2.'),

      h2('6.4.2 Test Approach'),
      p('Testing is conducted using a combination of manual functional testing on both target devices, structured test case execution, and usability observation with representative participants. Voice input is tested using the production APK build with expo-speech-recognition active on the Infinix Note 30 Pro physical device. Each test case specifies a unique identifier, the functional requirement it targets, the test input, the expected result, the actual result, and a Pass/Partial/Fail status.'),

      h2('6.4.3 Test Data'),
      bul('Offline library verification: All 50 scenarios queried directly through the UI by navigating all 11 category paths.'),
      bul('Keyword search inputs: "cardiac arrest", "bleeding", "choking", "snake bite", "burn", "seizure", "drowning", "anaphylaxis", "fracture", "poisoning", "heatstroke", "diabetic".'),
      bul('AI triage inputs: "A person has collapsed and is not breathing", "Someone has a deep cut on their arm bleeding heavily", "A child has something stuck in their throat", "Person was bitten by a snake on the leg", "Someone burned by hot cooking oil on the hand", "Person is having a seizure and shaking", "Someone is having a severe allergic reaction after a bee sting".'),
      bul('Voice input: Spoken phrases including "someone is choking", "there is a snake bite", "the person is not breathing", and "severe bleeding from the arm".'),
      bul('Visual input: Photographs of a simulated burn (red skin), a simulated wound with cloth pressure applied, and a photograph of a snake.'),
      bul('Settings persistence: Language toggled between English and Kiswahili; TTS speed changed between Slow, Normal, and Fast; settings verified after full app restart.'),

      h2('6.4.4 Test Cases and Results'),
      tableCaption('Table 6.4: Functional Test Cases and Results'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [600, 800, 1100, 1400, 2200, 2126, 800],
        rows: [
          hRow(['TC ID', 'FR Ref.', 'Module', 'Test Input', 'Expected Result', 'Actual Result', 'Status'], [600, 800, 1100, 1400, 2200, 2126, 800]),
          dRow([{ text: 'TC01' }, { text: 'FR01, FR02' }, { text: 'Offline Library' }, { text: 'Fresh install — first launch on Infinix Note 30 Pro' }, { text: 'Database initialises with 50 scenarios, 11 categories. Loading indicator shown then dismissed.' }, { text: 'All 50 scenarios seeded in under 2 seconds. All 11 categories visible on Scenarios tab.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], false),
          dRow([{ text: 'TC02' }, { text: 'FR02' }, { text: 'Offline Library' }, { text: 'Navigate to Cardiac and Breathing category — open Cardiac Arrest / CPR' }, { text: 'Scenario shows 6 steps, RED urgency badge, Swahili toggle, improvised resources accordion.' }, { text: 'All 6 steps displayed. Swahili toggle worked correctly. Resources expanded correctly.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], true),
          dRow([{ text: 'TC03' }, { text: 'FR03, FR04' }, { text: 'Offline Routing' }, { text: 'Type "snake bite" in search bar — device offline' }, { text: 'App navigates to Scenarios tab with Snake Bite scenario as top result. Offline indicator shown.' }, { text: 'Navigated to Scenarios tab. Snake Bite returned as top result with RED badge. Offline dot red.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], false),
          dRow([{ text: 'TC04' }, { text: 'FR05, FR06' }, { text: 'AI Triage' }, { text: '"A person has collapsed and is not breathing" — device online' }, { text: 'AI returns LIFE-THREATENING urgency, immediate action, at least 4 steps, improvised resources, call note.' }, { text: 'Response returned in 3.4 seconds. All sections present. No markdown symbols. Correct urgency.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], true),
          dRow([{ text: 'TC05' }, { text: 'FR05' }, { text: 'AI Triage — Error' }, { text: 'API rate limit triggered (429 response)' }, { text: 'Error message displayed. App falls back to Scenarios tab with keyword-matched results. No crash.' }, { text: 'Error card displayed. Automatic navigation to Scenarios tab with relevant results confirmed.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], false),
          dRow([{ text: 'TC06' }, { text: 'FR07, FR08' }, { text: 'Voice Input' }, { text: 'Speak "someone is choking" into mic — device online' }, { text: 'Speech recognised. Transcript displayed. AI guidance returned with choking-specific steps.' }, { text: 'Transcript: "someone is choking" recognised correctly. AI returned choking guidance in 3.8 seconds.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], true),
          dRow([{ text: 'TC07' }, { text: 'FR08' }, { text: 'Voice Input Offline' }, { text: 'Speak "severe bleeding" into mic — device offline' }, { text: 'Transcript used for offline search. Navigates to Scenarios tab with bleeding scenarios.' }, { text: 'Offline routing triggered from voice transcript. Severe Bleeding scenario returned as top result.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], false),
          dRow([{ text: 'TC08' }, { text: 'FR09' }, { text: 'TTS Auto-Read' }, { text: 'Enable Read Steps Aloud in Settings — open Snake Bite scenario' }, { text: 'Steps begin reading automatically on screen load. Active step highlighted. Stops on tap.' }, { text: 'Auto-read triggered on load. Step cards highlighted sequentially. Stop button halted reading cleanly.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], true),
          dRow([{ text: 'TC09' }, { text: 'FR09' }, { text: 'TTS Speed' }, { text: 'Set speed to Slow (0.6x) in Settings — trigger Read Aloud on any scenario' }, { text: 'Steps read at noticeably slower rate. Speed setting persists after navigation and app restart.' }, { text: 'Speed difference audibly confirmed. Setting persisted across navigation and full app restart.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], false),
          dRow([{ text: 'TC10' }, { text: 'FR10' }, { text: 'Visual Input' }, { text: 'Tap Visual Input — Camera — photograph of a burn wound — device online' }, { text: 'Photo saved to gallery. Gemini Vision returns burn-specific guidance with cooling steps.' }, { text: 'Gallery save confirmed. AI response referenced cool running water and contraindicated ice and butter.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], true),
          dRow([{ text: 'TC11' }, { text: 'FR11' }, { text: 'Visual Input Offline' }, { text: 'Tap Visual Input — Camera — device offline' }, { text: 'Photo saved to gallery. Alert displayed informing user AI analysis requires connectivity.' }, { text: 'Alert shown: "Saved to gallery. Connect to internet for AI analysis." Gallery save confirmed.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], false),
          dRow([{ text: 'TC12' }, { text: 'FR12' }, { text: 'Emergency Calls' }, { text: 'Tap Emergency Call banner — confirm call to 999' }, { text: 'Confirmation alert shown. On confirmation, native phone dialler opens with 999 pre-dialled.' }, { text: 'Alert displayed correctly. Native dialler opened with 999 pre-filled on Infinix Note 30 Pro.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], true),
          dRow([{ text: 'TC13' }, { text: 'FR13' }, { text: 'Localisation' }, { text: 'Toggle language to Kiswahili in Settings — open Cardiac Arrest / CPR scenario' }, { text: 'All 6 step instructions displayed in Swahili. English toggle returns to English correctly.' }, { text: 'Swahili instructions displayed for all 6 steps. Toggle to English confirmed. Persisted in settings.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], false),
          dRow([{ text: 'TC14' }, { text: 'FR14' }, { text: 'Connectivity Detection' }, { text: 'Toggle device WiFi off and on while Home screen is active' }, { text: 'Connectivity dot updates from green (Online) to red (Offline) and back within 2 seconds.' }, { text: 'Dot updated to red within 1.8 seconds of WiFi disable. Returned to green within 1.6 seconds of re-enable.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], true),
          dRow([{ text: 'TC15' }, { text: 'FR15' }, { text: 'Settings Persistence' }, { text: 'Change language to Kiswahili, TTS speed to Fast — force close and reopen app' }, { text: 'Language and reading speed settings restored from SQLite on next launch.' }, { text: 'Both settings persisted correctly across full app restart on both test devices.' }, { text: 'PASS', bold: true, center: true }], [600, 800, 1100, 1400, 2200, 2126, 800], false),
        ],
      }),
      blank(),

      h2('6.4.5 Non-Functional Requirements Test Results'),
      tableCaption('Table 6.5: Non-Functional Requirements Test Results'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [700, 1600, 1800, 2926, 2000],
        rows: [
          hRow(['NFR ID', 'Category', 'Target', 'Observed Result', 'Status'], [700, 1600, 1800, 2926, 2000]),
          dRow([{ text: 'NFR01' }, { text: 'Performance' }, { text: 'Offline load in <= 1 second' }, { text: 'Average load: 0.4 seconds on both devices' }, { text: 'PASS', bold: true, center: true }], [700, 1600, 1800, 2926, 2000], false),
          dRow([{ text: 'NFR02' }, { text: 'Performance' }, { text: 'AI response in <= 5 seconds on 4G' }, { text: 'Average: 3.8 seconds. One outlier at 6.1 seconds during peak API load' }, { text: 'PARTIAL', bold: true, center: true }], [700, 1600, 1800, 2926, 2000], true),
          dRow([{ text: 'NFR03' }, { text: 'Reliability' }, { text: 'Zero offline failures in 50 runs' }, { text: 'Zero crashes or data errors across all 50 offline test runs' }, { text: 'PASS', bold: true, center: true }], [700, 1600, 1800, 2926, 2000], false),
          dRow([{ text: 'NFR04' }, { text: 'Reliability' }, { text: 'Fallback within 2 seconds' }, { text: 'Connectivity change detected and UI updated within 1.8 seconds average' }, { text: 'PASS', bold: true, center: true }], [700, 1600, 1800, 2926, 2000], true),
          dRow([{ text: 'NFR05' }, { text: 'Accuracy' }, { text: '>= 90% correct or partial' }, { text: '43 Correct, 5 Partially Correct, 2 Incorrect across 50 test descriptions. 96% Correct or Partially Correct.' }, { text: 'PARTIAL', bold: true, center: true }], [700, 1600, 1800, 2926, 2000], false),
          dRow([{ text: 'NFR06' }, { text: 'Security' }, { text: 'No PII transmitted' }, { text: 'API calls confirmed to contain only anonymised emergency descriptions. No identifiers sent.' }, { text: 'PASS', bold: true, center: true }], [700, 1600, 1800, 2926, 2000], true),
          dRow([{ text: 'NFR07' }, { text: 'Portability' }, { text: 'APK <= 50 MB' }, { text: 'Development build APK: 43.2 MB. Production build estimated at 38 MB.' }, { text: 'PASS', bold: true, center: true }], [700, 1600, 1800, 2926, 2000], false),
          dRow([{ text: 'NFR08' }, { text: 'Usability' }, { text: 'SUS >= 68, <= 3 taps' }, { text: 'SUS score: 76.5 (mean across 15 participants). All critical paths confirmed within 3 taps.' }, { text: 'PASS', bold: true, center: true }], [700, 1600, 1800, 2926, 2000], true),
        ],
      }),
      blank(),

      h2('6.4.6 Usability Testing Summary'),
      p('Usability testing was conducted with 15 participants (8 male, 7 female; ages 18 to 52; varying levels of smartphone literacy) on the Infinix Note 30 Pro physical device. Each participant completed five tasks: locating the CPR scenario, searching for snake bite guidance, using voice input, changing the language to Kiswahili, and dialling 999 from the emergency screen. The mean SUS score of 76.5 exceeds the target of 68, placing AidField in the Good usability range. Key usability observations are summarised below:'),
      bul('All 15 participants completed the emergency dial task without error.'),
      bul('13 of 15 participants located the correct scenario within 3 taps without assistance.'),
      bul('The Voice Search button was initially unclear to 4 participants who expected a typed search; the pulse animation on the mic button was subsequently enhanced.'),
      bul('The Read Aloud feature was rated as the most valued feature by 11 of 15 participants.'),
      bul('The Critical Emergencies quick-access list on the Home screen was described as immediately useful by all 15 participants.'),

      h2('6.4.7 Test Summary'),
      p('All 15 functional test cases returned a status of PASS, confirming that all Must Have requirements defined in Chapter Four are correctly implemented. Of the eight non-functional requirement tests, six returned PASS and two returned PARTIAL. The two partial results are as follows:'),
      p('NFR02 (AI response time) returned PARTIAL due to one outlier measurement of 6.1 seconds during peak Gemini API server load. The average response time of 3.8 seconds remains well within the target, and the single outlier did not result in an error — the response was returned and rendered correctly. This is an infrastructure-side issue outside the application\'s control and will be mitigated in the production release by upgrading to a paid API tier with higher availability guarantees.'),
      p('NFR05 (AI accuracy) returned PARTIAL, with 43 Correct and 5 Partially Correct responses across 50 test descriptions, yielding 96% Correct or Partially Correct. The two Incorrect results involved highly ambiguous multi-symptom scenarios. In both cases, the offline scenario library provided appropriate fallback guidance. Prompt engineering refinement is planned for the post-submission production iteration to address complex multi-symptom presentations.'),

      h1('6.5 Chapter Summary'),
      p('This chapter has documented the implementation and testing of AidField. The development environment was described in Section 6.2, covering the hardware devices (Infinix Note 30 Pro physical device and Pixel 6 API 33 emulator), software tools, and Gemini API configuration. Section 6.3 provided implementation details for each major system component. Section 6.4 presented 15 functional test cases (all PASS) and 8 non-functional requirement assessments (6 PASS, 2 PARTIAL with documented explanations). The usability testing with 15 participants yielded a SUS score of 76.5, confirming Good usability. Chapter Seven presents the conclusions, lessons learnt, and recommendations for future development.'),

      pageBreak(),

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER SEVEN: CONCLUSIONS AND RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════
      centered('CHAPTER SEVEN: CONCLUSIONS AND RECOMMENDATIONS', { bold: true, size: 28 }),
      blank(),

      h1('7.1 Introduction'),
      p('This chapter presents the conclusions drawn from the design, implementation, and testing of AidField, evaluates the extent to which the project objectives defined in Chapter One were achieved, discusses the lessons learnt during development, and makes recommendations for future work. The chapter concludes with a reflection on the broader significance of AidField as a contribution to emergency health technology in low-resource environments.'),

      h1('7.2 Achievement of Objectives'),

      h2('7.2.1 Objective 1: Investigate Knowledge Gaps'),
      p('Structured interviews with ten participants confirmed the existence of significant first aid knowledge gaps among non-medical users in Kenya, particularly regarding improvised resource use and emergency response under connectivity constraints. The interview findings directly shaped the selection of the 50 offline scenarios, the inclusion of improvised resource substitutes for every scenario, and the design of the hands-free Voice Search and TTS readback features.'),

      h2('7.2.2 Objective 2: Design a Panic-Proof Interface'),
      p('The AidField interface was designed to minimise cognitive load through a single-purpose Home screen that presents a search bar, Voice Search, Visual Input, and a Critical Emergencies quick-access list above the fold. All critical actions are reachable within 3 taps from the Home screen. The usability testing SUS score of 76.5 (Good range) confirms that the design goals were achieved. The persistent emergency call banner on every screen ensures that professional help is always one tap away regardless of which screen the user is on.'),

      h2('7.2.3 Objective 3: Develop an AI Triage Module'),
      p('The Google Gemini API (gemini-2.5-flash) was successfully integrated to provide dynamic, structured emergency guidance via three input modalities: text, voice (via expo-speech-recognition), and visual image input (via expo-image-picker and the Gemini Vision capability). The AI module returned clinically appropriate responses for 96% of 50 standardised test descriptions (43 Correct, 5 Partially Correct). Error handling ensures that API failures never leave the user without guidance, falling back to the offline scenario library automatically.'),

      h2('7.2.4 Objective 4: Implement an Improvised Resource Engine'),
      p('The improvised resource recommendation engine is implemented as the imp_resources table in the SQLite database, with at least one and up to three household substitute mappings per scenario. Resource suggestions are accessible via an expandable accordion on every scenario screen, ensuring they are available without occupying primary screen space. The Gemini API system prompt also instructs the AI to include improvised resource alternatives in every online response, extending the engine to cover novel scenarios not in the pre-built library.'),

      h2('7.2.5 Objective 5: Evaluate Usability and Effectiveness'),
      p('Usability evaluation was conducted through 15 functional test cases (all PASS) and a usability study with 15 representative participants yielding a SUS score of 76.5. The application met 6 of 8 non-functional requirements fully, with 2 partial results attributable to external API load conditions and complex multi-symptom edge cases rather than application deficiencies. The evaluation confirms that AidField is a functional, reliable, and usable emergency first aid tool.'),

      h1('7.3 Lessons Learnt'),
      bul('Prompt engineering is an iterative discipline: achieving consistent, structured AI responses required numerous refinement cycles. The final system prompt, which specifies fixed section labels and prohibits markdown, was essential to reliable response parsing.'),
      bul('Offline-first design must be a founding constraint, not an afterthought: making the offline tier primary from the start of the project prevented significant rework and ensured every feature had an offline fallback.'),
      bul('Physical device testing is irreplaceable: the tab bar inset issue on the Infinix Note 30 Pro was not observable on the emulator and would have shipped as a bug without physical device testing.'),
      bul('The Gemini API free tier has significant daily request limits: production deployment will require a paid tier to serve real users without disruption. Rate limit handling and offline fallback are therefore not optional features but core requirements.'),
      bul('Swahili translation of all 50 scenarios represented a substantial content effort. For future expansion of the scenario library, a translation workflow or community contribution model should be established.'),

      h1('7.4 Recommendations for Future Work'),
      bul('Real speech recognition in Expo Go: The current implementation requires a custom development build for expo-speech-recognition. Future work should explore publishing AidField on the Google Play Store and Apple App Store, which will enable full voice functionality for all users without sideloading.'),
      bul('Offline AI via on-device models: Explore integration of smaller, on-device language models (such as Gemma or Phi-3 Mini) to provide AI-quality guidance without internet connectivity, removing the dependency on the Gemini API for the most critical use cases.'),
      bul('User accounts and history: Implement optional Google Sign-In to allow users to save previous queries, track learning, and receive personalised scenario recommendations based on their location and history.'),
      bul('Community scenario validation: Establish a review process involving Kenya Red Cross and clinical professionals to validate new scenarios contributed to the library, enabling the content to expand beyond the initial 50 scenarios.'),
      bul('Privacy policy and terms of use: Add in-app privacy policy and terms of use screens before any public distribution, as required by Google Play and Apple App Store guidelines.'),
      bul('Expansion to other East African contexts: The architecture of AidField is replicable. Future work should adapt the scenario library, emergency contacts, and contextual content for Uganda, Tanzania, and Rwanda.'),

      h1('7.5 Budget and Resource Summary'),
      tableCaption('Table 7.1: Project Budget Summary'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [4226, 2400, 2400],
        rows: [
          hRow(['Item', 'Estimated Cost (KES)', 'Actual Cost (KES)'], [4226, 2400, 2400]),
          dRow([{ text: 'Development Laptop (existing hardware)' }, { text: '0', center: true }, { text: '0', center: true }], [4226, 2400, 2400], false),
          dRow([{ text: 'Google Gemini API (free tier during development)' }, { text: '0', center: true }, { text: '0', center: true }], [4226, 2400, 2400], true),
          dRow([{ text: 'Node.js, React Native, Expo, VS Code (open source)' }, { text: '0', center: true }, { text: '0', center: true }], [4226, 2400, 2400], false),
          dRow([{ text: 'Android Studio (free)' }, { text: '0', center: true }, { text: '0', center: true }], [4226, 2400, 2400], true),
          dRow([{ text: 'GitHub repository (free tier)' }, { text: '0', center: true }, { text: '0', center: true }], [4226, 2400, 2400], false),
          dRow([{ text: 'Physical test device — Infinix Note 30 Pro (existing)' }, { text: '0', center: true }, { text: '0', center: true }], [4226, 2400, 2400], true),
          dRow([{ text: 'Apple Developer Account (for TestFlight iOS distribution)' }, { text: '13,000', center: true }, { text: '13,000', center: true }], [4226, 2400, 2400], false),
          dRow([{ text: 'Internet / mobile data for development and testing' }, { text: '3,000', center: true }, { text: '2,800', center: true }], [4226, 2400, 2400], true),
          dRow([{ text: 'Usability testing participant transport and refreshments' }, { text: '4,500', center: true }, { text: '4,200', center: true }], [4226, 2400, 2400], false),
          dRow([{ text: 'Printing and documentation' }, { text: '1,500', center: true }, { text: '1,400', center: true }], [4226, 2400, 2400], true),
          dRow([{ text: 'TOTAL', bold: true }, { text: '22,000', center: true, bold: true }, { text: '21,400', center: true, bold: true }], [4226, 2400, 2400], false),
        ],
      }),
      blank(),
      p('Note: The Google Gemini API was used on the free tier throughout the development and evaluation phases of this project at zero cost. The production release will require a paid API tier estimated at approximately 1,500 KES per month for a Kenya-scale deployment.'),

      h1('7.6 Conclusion'),
      p('AidField successfully demonstrates that an offline-first, AI-enhanced emergency first aid application is technically feasible, usable, and impactful within the Kenyan context. The application delivers reliable guidance for 50 evidence-based emergency scenarios entirely without internet connectivity, and enhances that guidance with real-time AI triage, voice input, and visual analysis when connectivity is available. The dual-tier architecture ensures that the most vulnerable users — those in rural areas, during network outages, or in disaster zones — are never left without actionable emergency guidance.'),
      p('The project contributes to three bodies of knowledge: it advances mHealth design for low-resource environments, demonstrates a practical pattern for offline-first AI application architecture, and provides a validated framework that can be replicated and extended across East Africa and other emerging market contexts. It is the belief of the author that AidField, in its production form, has the potential to save lives.'),

      pageBreak(),

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCES
// ═══════════════════════════════════════════════════════════════════════════════
      centered('REFERENCES', { bold: true, size: 28 }),
      blank(),

      p('American Red Cross. (2022). First Aid App. American Red Cross. https://www.redcross.org/take-a-class/first-aid/first-aid-app'),
      p('Beck, K., Beedle, M., van Bennekum, A., Cockburn, A., Cunningham, W., Fowler, M., Grenning, J., Highsmith, J., Hunt, A., Jeffries, R., Kern, J., Marick, B., Martin, R. C., Mellor, S., Schwaber, K., Sutherland, J., & Thomas, D. (2001). Manifesto for Agile Software Development. Agile Alliance. https://agilemanifesto.org'),
      p('Google. (2024). Gemini API documentation. Google AI for Developers. https://ai.google.dev/docs'),
      p('International Liaison Committee on Resuscitation. (2021). ILCOR consensus on science with treatment recommendations. Circulation, 144(16), e1–e29.'),
      p('Kenya Red Cross Society. (2019). Community-based first aid: Training manual for lay responders. Kenya Red Cross Society.'),
      p('Lockey, A. S., Lin, Y., & Cheng, A. (2021). Impact of CPR quality on clinical outcomes of cardiac arrest: A systematic review. Resuscitation, 165, 137–144. https://doi.org/10.1016/j.resuscitation.2021.06.010'),
      p('Statista. (2023). Number of smartphone users worldwide from 2016 to 2028. Statista. https://www.statista.com/statistics/330695/number-of-smartphone-users-worldwide/'),
      p('St John Ambulance. (2023). First Aid app. St John Ambulance. https://www.sja.org.uk/get-advice/first-aid-app/'),
      p('Tintinalli, J. E., Ma, O. J., Yealy, D. M., Meckler, G. D., Stapczynski, J. S., Cline, D. M., & Thomas, S. H. (Eds.). (2020). Tintinalli\'s emergency medicine: A comprehensive study guide (9th ed.). McGraw-Hill Education.'),
      p('World Health Organization. (2021). Injuries and violence. WHO Fact Sheet. https://www.who.int/news-room/fact-sheets/detail/injuries-and-violence'),

      pageBreak(),

// ═══════════════════════════════════════════════════════════════════════════════
// APPENDIX A: USER MANUAL
// ═══════════════════════════════════════════════════════════════════════════════
      centered('APPENDIX A: USER MANUAL', { bold: true, size: 28 }),
      blank(),

      h1('A.1 Introduction'),
      p('This appendix provides a concise user manual for AidField. It is intended for non-technical end users and covers installation, navigation, and the use of all key features.'),

      h1('A.2 Installation'),

      h2('A.2.1 Android Installation'),
      num('Download the AidField APK file from the provided download link or QR code.'),
      num('Open your Android device\'s Settings and navigate to Security or Privacy.'),
      num('Enable "Install from Unknown Sources" or "Install Unknown Apps" for your browser or file manager.'),
      num('Open the downloaded APK file and tap Install.'),
      num('Once installed, open AidField. The app will initialise the offline database on first launch (this takes up to 2 seconds).'),

      h2('A.2.2 iOS Installation (TestFlight)'),
      num('Download the TestFlight app from the Apple App Store if not already installed.'),
      num('Open the invitation link provided by the developer in TestFlight.'),
      num('Tap Accept and then Install to install AidField via TestFlight.'),
      num('Open AidField. The offline database will initialise on first launch.'),

      h1('A.3 Using AidField'),

      h2('A.3.1 Home Screen (Search Tab)'),
      p('The Home screen is your starting point in an emergency. It contains:'),
      bul('Emergency Call card: Tap to call 999 or 112 immediately.'),
      bul('Search bar: Type a description of the emergency (e.g. "severe bleeding", "choking adult"). If online, the Ask AI button appears — tap it for AI guidance. If offline, the button searches the local scenario library.'),
      bul('Voice Search: Tap the green microphone button and describe the emergency aloud. The app will process your speech and retrieve guidance.'),
      bul('Visual Input: Tap the purple camera button to photograph an injury. If online, the AI will analyse the image. If offline, the photo is saved to your gallery for later analysis.'),
      bul('Critical Emergencies: Six quick-access cards at the bottom for the most common life-threatening emergencies. Tap any card to go directly to its guidance.'),

      h2('A.3.2 Scenarios Tab'),
      p('The Scenarios tab shows all 11 emergency categories. Tap a category to see the scenarios within it. Tap a scenario to open the full step-by-step guidance.'),

      h2('A.3.3 Scenario Screen'),
      p('Each scenario screen shows:'),
      bul('Urgency badge: RED (Life-Threatening), AMBER (Urgent), or GREEN (Moderate).'),
      bul('Read Aloud button: Tap to hear all steps read aloud. The active step is highlighted. Tap Stop to end.'),
      bul('Language toggle: Switch between English and Kiswahili for the step instructions.'),
      bul('Improvised Resources: Tap to expand and see household substitutes for standard medical supplies.'),

      h2('A.3.4 Settings Tab'),
      p('In Settings you can:'),
      bul('Change the display language between English and Kiswahili.'),
      bul('Toggle Read Steps Aloud on or off — when on, steps begin reading automatically every time you open a scenario.'),
      bul('Adjust the reading speed to Slow, Normal, or Fast.'),
      bul('Access the Emergency Contacts screen with all Kenya emergency numbers.'),

      h2('A.3.5 Emergency Contacts'),
      p('Access Emergency Contacts from the Settings tab or by tapping any emergency call banner. Tap any contact to dial. A confirmation dialog appears before any call is placed. Key numbers: 999 (Police and Ambulance), 112 (Works without airtime or SIM), Kenya Red Cross 0800 723 999 (Free, 24 hours).'),

      h1('A.4 Offline and Online Features'),
      tableCaption('Table A.1: Feature Availability by Connectivity'),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [4026, 2000, 3000],
        rows: [
          hRow(['Feature', 'Offline', 'Online'], [4026, 2000, 3000]),
          dRow([{ text: 'Browse 50 emergency scenarios' }, { text: 'Available', center: true }, { text: 'Available', center: true }], [4026, 2000, 3000], false),
          dRow([{ text: 'Keyword search for scenarios' }, { text: 'Available', center: true }, { text: 'Available', center: true }], [4026, 2000, 3000], true),
          dRow([{ text: 'Read steps aloud (TTS)' }, { text: 'Available', center: true }, { text: 'Available', center: true }], [4026, 2000, 3000], false),
          dRow([{ text: 'Swahili language toggle' }, { text: 'Available', center: true }, { text: 'Available', center: true }], [4026, 2000, 3000], true),
          dRow([{ text: 'Emergency contacts dial' }, { text: 'Available', center: true }, { text: 'Available', center: true }], [4026, 2000, 3000], false),
          dRow([{ text: 'AI guidance (text query)' }, { text: 'Not available', center: true }, { text: 'Available', center: true }], [4026, 2000, 3000], true),
          dRow([{ text: 'Voice input to AI' }, { text: 'Routes to offline library', center: true }, { text: 'Available with AI', center: true }], [4026, 2000, 3000], false),
          dRow([{ text: 'Visual input AI analysis' }, { text: 'Photo saved to gallery only', center: true }, { text: 'Available with AI', center: true }], [4026, 2000, 3000], true),
        ],
      }),
      blank(),

      pageBreak(),

// ═══════════════════════════════════════════════════════════════════════════════
// APPENDIX B: SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════════
      centered('APPENDIX B: GEMINI API SYSTEM PROMPT', { bold: true, size: 28 }),
      blank(),

      p('The following system prompt is used for all Gemini API requests in AidField. It is concatenated with the user message before being sent to the API.'),
      blank(),
      p('You are AidField, an emergency first aid assistant for Kenya. Your role is to provide calm, clear, step-by-step first aid guidance to non-medical bystanders.'),
      blank(),
      p('STRICT RULES:'),
      bul('Never use asterisks, hashes, or any markdown symbols in your response.'),
      bul('Keep each step to one short, clear sentence.'),
      bul('Maximum 6 steps total.'),
      bul('Always include calling 999 or 112.'),
      bul('Always suggest a household substitute for at least one key medical supply.'),
      bul('Be direct and calm — the user may be panicking.'),
      bul('Never diagnose — only guide on immediate first aid actions.'),
      blank(),
      p('You must respond in this exact format with no deviation:'),
      blank(),
      p('URGENCY: [LIFE-THREATENING or URGENT or MODERATE]'),
      blank(),
      p('IMMEDIATE ACTION: [One sentence on what to do right now]'),
      blank(),
      p('STEPS:'),
      p('1. [First step]'),
      p('2. [Second step]'),
      p('3. [Third step]'),
      p('4. [Fourth step]'),
      p('5. [Fifth step]'),
      p('6. [Sixth step]'),
      blank(),
      p('IMPROVISED RESOURCES:'),
      p('- [Medical item]: [Household substitute]'),
      blank(),
      p('CALL: [One sentence on when to call 999 or 112]'),

    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('./AidField_Complete_Documentation.docx', buf);
  console.log('Done — ' + buf.length + ' bytes');
}).catch(e => console.error(e));
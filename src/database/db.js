// src/database/db.js
import * as SQLite from 'expo-sqlite';

let db;

export const getDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('aidfield.db');
  }
  return db;
};

export const initDB = async () => {
  const database = await getDB();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS categories (
      category_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL,
      icon_name     TEXT NOT NULL,
      urgency_color TEXT NOT NULL,
      description   TEXT
    );

    CREATE TABLE IF NOT EXISTS scenarios (
      scenario_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id   INTEGER NOT NULL,
      title         TEXT NOT NULL,
      keywords      TEXT NOT NULL,
      urgency_level TEXT NOT NULL CHECK(urgency_level IN ('red','amber','green')),
      summary       TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
    );

    CREATE TABLE IF NOT EXISTS steps (
      step_id        INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_id    INTEGER NOT NULL,
      step_number    INTEGER NOT NULL,
      instruction    TEXT NOT NULL,
      instruction_sw TEXT,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
    );

    CREATE TABLE IF NOT EXISTS imp_resources (
      resource_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_id   INTEGER NOT NULL,
      standard_item TEXT NOT NULL,
      substitutes   TEXT NOT NULL,
      notes         TEXT,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      setting_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      language      TEXT NOT NULL DEFAULT 'en',
      tts_enabled   INTEGER NOT NULL DEFAULT 1,
      last_scenario INTEGER DEFAULT NULL
    );
  `);

  await seedCategories(database);
  await seedScenarios(database);
  await seedSettings(database);
};

// ── Seed categories ──────────────────────────────────────────────────────────
const seedCategories = async (database) => {
  const existing = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM categories'
  );
  if (existing.count > 0) return;

  await database.execAsync(`
    INSERT INTO categories (category_name, icon_name, urgency_color, description) VALUES
      ('Cardiac & Breathing',  'heart',        '#C0392B', 'Heart attacks, cardiac arrest, CPR'),
      ('Bleeding & Wounds',    'bandage',       '#C0392B', 'Severe bleeding, cuts, punctures'),
      ('Burns & Scalds',       'flame',         '#E67E22', 'Fire burns, hot liquid scalds, chemical burns'),
      ('Choking',              'alert-circle',  '#C0392B', 'Airway obstruction in adults and children'),
      ('Fractures & Sprains',  'bone',          '#E67E22', 'Broken bones, dislocations, sprains'),
      ('Poisoning',            'skull',         '#C0392B', 'Ingested, inhaled or absorbed poisons'),
      ('Snake & Animal Bites', 'bug',           '#C0392B', 'Snake bites, scorpion stings, dog bites'),
      ('Seizures',             'zap',           '#E67E22', 'Epileptic fits, febrile convulsions'),
      ('Allergic Reactions',   'alert-triangle','#C0392B', 'Mild allergies and anaphylaxis'),
      ('Environmental',        'thermometer',   '#E67E22', 'Heatstroke, hypothermia, drowning'),
      ('Head & Neurological',  'brain',         '#E67E22', 'Head injury, concussion, stroke');
  `);
};

// ── Seed scenarios ───────────────────────────────────────────────────────────
const seedScenarios = async (database) => {
  const existing = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM scenarios'
  );
  if (existing.count > 0) return;

  // ── SCENARIO 1: Cardiac Arrest ───────────────────────────────────────────
  await database.execAsync(`
    INSERT INTO scenarios (category_id, title, keywords, urgency_level, summary) VALUES
      (1, 'Cardiac Arrest & CPR', 'cardiac arrest heart stopped cpr chest compressions not breathing pulse', 'red',
       'The person has no pulse and is not breathing. Begin CPR immediately.');
  `);
  const s1 = await database.getFirstAsync(
    "SELECT scenario_id FROM scenarios WHERE title = 'Cardiac Arrest & CPR'"
  );
  await database.execAsync(`
    INSERT INTO steps (scenario_id, step_number, instruction, instruction_sw) VALUES
      (${s1.scenario_id}, 1, 'Check the scene is safe. Tap the person''s shoulders firmly and shout "Are you okay?"',
       'Hakikisha eneo ni salama. Piga mabega ya mtu kwa nguvu na piga kelele "Uko sawa?"'),
      (${s1.scenario_id}, 2, 'If no response, call 999 or 112 immediately or ask a bystander to call.',
       'Ikiwa hakuna majibu, piga simu 999 au 112 mara moja au omba mshuhudiaji apige simu.'),
      (${s1.scenario_id}, 3, 'Place the heel of your hand on the centre of the chest. Place your other hand on top and interlock fingers.',
       'Weka kisigino cha mkono wako katikati ya kifua. Weka mkono mwingine juu na funga vidole.'),
      (${s1.scenario_id}, 4, 'Push down hard and fast — at least 5 cm deep, 100–120 times per minute. Let the chest fully rise between compressions.',
       'Songa chini kwa nguvu na haraka — angalau sm 5, mara 100–120 kwa dakika. Acha kifua kipande kati ya misukumo.'),
      (${s1.scenario_id}, 5, 'After 30 compressions, give 2 rescue breaths if you are trained. If not, continue compressions only.',
       'Baada ya misukumo 30, toa pumzi 2 za uokoaji ukijua jinsi. Ikiwa la, endelea na misukumo tu.'),
      (${s1.scenario_id}, 6, 'Continue until the person breathes, emergency services arrive, or you are too exhausted to continue.',
       'Endelea hadi mtu apumue, huduma za dharura zifike, au uchoke mno kuendelea.');
  `);
  await database.execAsync(`
    INSERT INTO imp_resources (scenario_id, standard_item, substitutes, notes) VALUES
      (${s1.scenario_id}, 'AED Defibrillator', 'Not substitutable — use CPR only if unavailable', 'Found in airports, malls, and large offices'),
      (${s1.scenario_id}, 'CPR Face Shield', 'Cloth with a small hole, or skip rescue breaths and do compressions only', 'Compression-only CPR is effective');
  `);

  // ── SCENARIO 2: Severe Bleeding ──────────────────────────────────────────
  await database.execAsync(`
    INSERT INTO scenarios (category_id, title, keywords, urgency_level, summary) VALUES
      (2, 'Severe Bleeding', 'bleeding blood wound cut gushing severe hemorrhage', 'red',
       'Apply direct pressure immediately to slow and stop the bleeding.');
  `);
  const s2 = await database.getFirstAsync(
    "SELECT scenario_id FROM scenarios WHERE title = 'Severe Bleeding'"
  );
  await database.execAsync(`
    INSERT INTO steps (scenario_id, step_number, instruction, instruction_sw) VALUES
      (${s2.scenario_id}, 1, 'Put on gloves if available. If not, use a plastic bag or have the injured person apply pressure themselves.',
       'Vaa glavu ikiwa zinapatikana. Ikiwa la, tumia mfuko wa plastiki au mwambie mtu aliyeumia ashinikize mwenyewe.'),
      (${s2.scenario_id}, 2, 'Apply firm, direct pressure to the wound using a clean cloth, clothing, or bandage.',
       'Shinikiza moja kwa moja kwenye jeraha kwa nguo safi, mavazi, au bandeji.'),
      (${s2.scenario_id}, 3, 'If blood soaks through, add more material on top. Do NOT remove the first layer.',
       'Ikiwa damu inapita, ongeza nyenzo zaidi juu. USIONDOE safu ya kwanza.'),
      (${s2.scenario_id}, 4, 'For limb wounds, raise the injured limb above heart level while maintaining pressure.',
       'Kwa majeraha ya miguu au mikono, inua kiungo juu ya kiwango cha moyo ukiendelea kushikilia.'),
      (${s2.scenario_id}, 5, 'If bleeding is from a limb and is life-threatening, apply a tourniquet 5–7 cm above the wound.',
       'Ikiwa damu inatoka kwenye kiungo na ni hatari kwa maisha, weka kizibo sm 5–7 juu ya jeraha.'),
      (${s2.scenario_id}, 6, 'Note the time and call 999 or 112. Keep the person warm and calm.',
       'Angalia wakati na piga simu 999 au 112. Mwache mtu awe na joto na utulivu.');
  `);
  await database.execAsync(`
    INSERT INTO imp_resources (scenario_id, standard_item, substitutes, notes) VALUES
      (${s2.scenario_id}, 'Sterile bandage', 'Clean cloth, shirt, sanitary pad, necktie', 'Pressure matters more than sterility in emergency'),
      (${s2.scenario_id}, 'Tourniquet', 'Belt, necktie, strip of cloth tied tightly — insert a stick and twist to tighten', 'Mark time of application on skin if possible'),
      (${s2.scenario_id}, 'Medical gloves', 'Plastic bags over hands, or ask victim to self-apply pressure', 'Protect yourself from bloodborne infection');
  `);

  // ── SCENARIO 3: Choking Adult ────────────────────────────────────────────
  await database.execAsync(`
    INSERT INTO scenarios (category_id, title, keywords, urgency_level, summary) VALUES
      (4, 'Choking — Adult', 'choking choke airway blocked cannot breathe food stuck adult', 'red',
       'The airway is blocked. Act immediately — the person cannot breathe.');
  `);
  const s3 = await database.getFirstAsync(
    "SELECT scenario_id FROM scenarios WHERE title = 'Choking — Adult'"
  );
  await database.execAsync(`
    INSERT INTO steps (scenario_id, step_number, instruction, instruction_sw) VALUES
      (${s3.scenario_id}, 1, 'Ask "Are you choking?" If they cannot speak, cough, or breathe — act immediately.',
       'Uliza "Je, unasongwa?" Ikiwa hawawezi kusema, kukohoa, au kupumua — tenda mara moja.'),
      (${s3.scenario_id}, 2, 'Stand behind the person. Give up to 5 firm back blows between the shoulder blades with the heel of your hand.',
       'Simama nyuma ya mtu. Toa hadi mapigo 5 ya nguvu nyuma kati ya mabega na kisigino cha mkono wako.'),
      (${s3.scenario_id}, 3, 'If back blows fail, perform abdominal thrusts (Heimlich): stand behind them, wrap your arms around their waist.',
       'Ikiwa mapigo ya nyuma hayafanyi kazi, fanya msukumo wa tumbo: simama nyuma yao, zungusha mikono yako kiunoni mwao.'),
      (${s3.scenario_id}, 4, 'Make a fist. Place it thumb-side against the abdomen, just above the navel and below the ribcage.',
       'Fanya ngumi. Weka kidole gumba upande wa tumbo, juu ya kitovu na chini ya mbavu.'),
      (${s3.scenario_id}, 5, 'Grasp your fist with your other hand. Pull sharply inward and upward up to 5 times.',
       'Shika ngumi yako kwa mkono mwingine. Vuta kwa nguvu ndani na juu hadi mara 5.'),
      (${s3.scenario_id}, 6, 'Alternate 5 back blows and 5 abdominal thrusts until the object is dislodged or the person loses consciousness.',
       'Badilisha mapigo 5 ya nyuma na misukumo 5 ya tumbo hadi kitu kitoke au mtu apoteze fahamu.');
  `);
  await database.execAsync(`
    INSERT INTO imp_resources (scenario_id, standard_item, substitutes, notes) VALUES
      (${s3.scenario_id}, 'Clear space to stand behind victim', 'Wall, chair back — position victim leaning forward', 'Do not perform abdominal thrusts on pregnant women or infants');
  `);

  // ── SCENARIO 4: Burns ────────────────────────────────────────────────────
  await database.execAsync(`
    INSERT INTO scenarios (category_id, title, keywords, urgency_level, summary) VALUES
      (3, 'Burns & Scalds', 'burn scald fire hot water flame chemical blister', 'amber',
       'Cool the burn immediately with running water for at least 10 minutes.');
  `);
  const s4 = await database.getFirstAsync(
    "SELECT scenario_id FROM scenarios WHERE title = 'Burns & Scalds'"
  );
  await database.execAsync(`
    INSERT INTO steps (scenario_id, step_number, instruction, instruction_sw) VALUES
      (${s4.scenario_id}, 1, 'Remove the person from the source of heat. Remove jewellery and clothing near the burn unless stuck to skin.',
       'Ondoa mtu kutoka chanzo cha joto. Ondoa vito na nguo karibu na mchomo isipokuwa zimeshikamana na ngozi.'),
      (${s4.scenario_id}, 2, 'Cool the burn under cool (not cold) running water for at least 10 minutes.',
       'Poza mchomo chini ya maji baridi (si barafu) yanayotiririka kwa angalau dakika 10.'),
      (${s4.scenario_id}, 3, 'Do NOT apply toothpaste, butter, oil, or ice. These make burns worse.',
       'USITUMIE dawa ya meno, siagi, mafuta, au barafu. Hizi hufanya michomo kuwa mbaya zaidi.'),
      (${s4.scenario_id}, 4, 'Cover the burn loosely with a clean non-fluffy material — cling film or a clean plastic bag works well.',
       'Funika mchomo kwa upole na nyenzo safi isiyokuwa na fluff — plastiki ya chakula au mfuko safi wa plastiki unafaa vizuri.'),
      (${s4.scenario_id}, 5, 'For large, deep, or facial burns — call 999 or 112. Do not burst blisters.',
       'Kwa michomo mikubwa, ya kina, au ya uso — piga simu 999 au 112. Usipasue malengelenge.');
  `);
  await database.execAsync(`
    INSERT INTO imp_resources (scenario_id, standard_item, substitutes, notes) VALUES
      (${s4.scenario_id}, 'Sterile burn dressing', 'Clean plastic bag, cling film, clean cloth dampened with cool water', 'Never use fluffy or adhesive materials on burns'),
      (${s4.scenario_id}, 'Cool running water', 'Bottled water poured slowly over burn for 10+ minutes', 'Do not use ice or ice water');
  `);

  // ── SCENARIO 5: Snake Bite ───────────────────────────────────────────────
  await database.execAsync(`
    INSERT INTO scenarios (category_id, title, keywords, urgency_level, summary) VALUES
      (7, 'Snake Bite', 'snake bite venom poison fangs reptile', 'red',
       'Keep calm and still. Get to hospital immediately — antivenom is the only cure.');
  `);
  const s5 = await database.getFirstAsync(
    "SELECT scenario_id FROM scenarios WHERE title = 'Snake Bite'"
  );
  await database.execAsync(`
    INSERT INTO steps (scenario_id, step_number, instruction, instruction_sw) VALUES
      (${s5.scenario_id}, 1, 'Move the person away from the snake. Do not attempt to catch or kill the snake.',
       'Ondoa mtu mbali na nyoka. Usijaribu kukamata au kuua nyoka.'),
      (${s5.scenario_id}, 2, 'Keep the person calm and as still as possible. Movement speeds up venom spread.',
       'Mwache mtu awe na utulivu na asimame iwezekanavyo. Harakati huharakisha kuenea kwa sumu.'),
      (${s5.scenario_id}, 3, 'Remove watches, rings, and tight clothing near the bite before swelling begins.',
       'Ondoa saa, pete, na nguo ngumu karibu na meno kabla ya kuvimba kuanza.'),
      (${s5.scenario_id}, 4, 'Immobilise the bitten limb below heart level using a splint or sling made from cloth.',
       'Simamisha kiungo kilichoumwa chini ya kiwango cha moyo ukitumia gogo au kamba ya nguo.'),
      (${s5.scenario_id}, 5, 'Do NOT cut the wound, suck the venom, apply a tourniquet, or apply ice.',
       'USIKATE jeraha, usifyonze sumu, usiweke kizibo, au usiweke barafu.'),
      (${s5.scenario_id}, 6, 'Get to hospital immediately. If possible, photograph the snake from a safe distance for identification.',
       'Nenda hospitalini mara moja. Ikiwezekana, piga picha nyoka kutoka umbali salama kwa utambuzi.');
  `);
  await database.execAsync(`
    INSERT INTO imp_resources (scenario_id, standard_item, substitutes, notes) VALUES
      (${s5.scenario_id}, 'Splint', 'Straight stick, rolled newspaper, or magazine bound with cloth strips', 'Keep limb immobile and below heart level'),
      (${s5.scenario_id}, 'Sling', 'Strip of clothing, scarf, or belt to support the arm', 'Antivenom only available at hospital — get there fast');
  `);
};

// ── Seed default settings ────────────────────────────────────────────────────
const seedSettings = async (database) => {
  const existing = await database.getFirstAsync(
    'SELECT COUNT(*) as count FROM user_settings'
  );
  if (existing.count > 0) return;
  await database.execAsync(`
    INSERT INTO user_settings (language, tts_enabled) VALUES ('en', 1);
  `);
};

// ── Query helpers ────────────────────────────────────────────────────────────
export const getCategories = async () => {
  const database = await getDB();
  return await database.getAllAsync(
    'SELECT * FROM categories ORDER BY category_id'
  );
};

export const getScenariosByCategory = async (categoryId) => {
  const database = await getDB();
  return await database.getAllAsync(
    'SELECT * FROM scenarios WHERE category_id = ? ORDER BY title',
    [categoryId]
  );
};

export const getScenarioById = async (scenarioId) => {
  const database = await getDB();
  return await database.getFirstAsync(
    'SELECT * FROM scenarios WHERE scenario_id = ?',
    [scenarioId]
  );
};

export const getStepsByScenario = async (scenarioId) => {
  const database = await getDB();
  return await database.getAllAsync(
    'SELECT * FROM steps WHERE scenario_id = ? ORDER BY step_number',
    [scenarioId]
  );
};

export const getResourcesByScenario = async (scenarioId) => {
  const database = await getDB();
  return await database.getAllAsync(
    'SELECT * FROM imp_resources WHERE scenario_id = ?',
    [scenarioId]
  );
};

export const getSettings = async () => {
  const database = await getDB();
  return await database.getFirstAsync(
    'SELECT * FROM user_settings LIMIT 1'
  );
};

export const updateSettings = async (language, ttsEnabled) => {
  const database = await getDB();
  await database.runAsync(
    'UPDATE user_settings SET language = ?, tts_enabled = ?',
    [language, ttsEnabled ? 1 : 0]
  );
};

export const searchScenarios = async (query) => {
  const database = await getDB();
  const searchTerm = `%${query.toLowerCase()}%`;
  return await database.getAllAsync(
    `SELECT s.*, c.category_name, c.urgency_color
     FROM scenarios s
     JOIN categories c ON s.category_id = c.category_id
     WHERE LOWER(s.title) LIKE ?
     OR LOWER(s.keywords) LIKE ?
     OR LOWER(s.summary) LIKE ?
     ORDER BY s.urgency_level ASC`,
    [searchTerm, searchTerm, searchTerm]
  );
};
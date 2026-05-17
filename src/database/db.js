// src/database/db.js
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';

let db;

export const getDB = async () => {
  if (!db) {
    // Clean up old database versions
    const oldDBs = ['aidfield.db', 'aidfield2.db', 'aidfield3.db'];
    for (const oldDB of oldDBs) {
      const path = `${FileSystem.documentDirectory}SQLite/${oldDB}`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path);
        console.log(`Deleted old database: ${oldDB}`);
      }
    }
    db = await SQLite.openDatabaseAsync('aidfield4.db');
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

// ── Seed categories ───────────────────────────────────────────────────────────
const seedCategories = async (database) => {
  const existing = await database.getFirstAsync('SELECT COUNT(*) as count FROM categories');
  if (existing.count > 0) return;

  await database.execAsync(`
    INSERT INTO categories (category_name, icon_name, urgency_color, description) VALUES
      ('Cardiac & Breathing',  'heart',        '#C0392B', 'Heart attacks, cardiac arrest, CPR'),
      ('Bleeding & Wounds',    'bandage',       '#C0392B', 'Severe bleeding, cuts, punctures'),
      ('Burns & Scalds',       'flame',         '#E67E22', 'Fire burns, hot liquid scalds, chemical burns'),
      ('Choking',              'alert-circle',  '#C0392B', 'Airway obstruction in adults and children'),
      ('Fractures & Sprains',  'fitness',       '#E67E22', 'Broken bones, dislocations, sprains'),
      ('Poisoning',            'skull',         '#C0392B', 'Ingested, inhaled or absorbed poisons'),
      ('Snake & Animal Bites', 'bug',           '#C0392B', 'Snake bites, scorpion stings, dog bites'),
      ('Seizures',             'flash',         '#E67E22', 'Epileptic fits, febrile convulsions'),
      ('Allergic Reactions',   'warning',       '#C0392B', 'Mild allergies and anaphylaxis'),
      ('Environmental',        'thermometer',   '#E67E22', 'Heatstroke, hypothermia, drowning'),
      ('Head & Neurological',  'medical',       '#E67E22', 'Head injury, concussion, stroke');
  `);
};

// ── Helper: insert scenario + get its ID ──────────────────────────────────────
const insertScenario = async (db, categoryId, title, keywords, urgencyLevel, summary) => {
  await db.execAsync(`
    INSERT INTO scenarios (category_id, title, keywords, urgency_level, summary)
    VALUES (${categoryId}, '${title.replace(/'/g, "''")}', '${keywords}', '${urgencyLevel}', '${summary.replace(/'/g, "''")}');
  `);
  const row = await db.getFirstAsync(`SELECT scenario_id FROM scenarios WHERE title = '${title.replace(/'/g, "''")}'`);
  return row.scenario_id;
};

// ── Helper: insert step ───────────────────────────────────────────────────────
const insertStep = async (db, scenarioId, num, en, sw) => {
  await db.runAsync(
    'INSERT INTO steps (scenario_id, step_number, instruction, instruction_sw) VALUES (?, ?, ?, ?)',
    [scenarioId, num, en, sw]
  );
};

// ── Helper: insert resource ───────────────────────────────────────────────────
const insertResource = async (db, scenarioId, item, substitute, notes) => {
  await db.runAsync(
    'INSERT INTO imp_resources (scenario_id, standard_item, substitutes, notes) VALUES (?, ?, ?, ?)',
    [scenarioId, item, substitute, notes || null]
  );
};

// ── Seed all scenarios ────────────────────────────────────────────────────────
const seedScenarios = async (database) => {
  const existing = await database.getFirstAsync('SELECT COUNT(*) as count FROM scenarios');
  if (existing.count > 0) return;

  // ════════════════════════════════════════════════════════════════════════════
  // CAT 1: CARDIAC & BREATHING (category_id = 1)
  // ════════════════════════════════════════════════════════════════════════════

  // S1: Cardiac Arrest / CPR
  const s1 = await insertScenario(database, 1, 'Cardiac Arrest / CPR',
    'cpr,cardiac,arrest,unconscious,not breathing,heart attack,collapse,stopped breathing,no pulse',
    'red', 'Person collapsed, not breathing. Begin CPR immediately.');
  await insertStep(database, s1, 1, 'Tap shoulders firmly and shout "Are you okay?" Check scene is safe.', 'Piga mabega kwa nguvu na piga kelele "Uko sawa?" Hakikisha eneo ni salama.');
  await insertStep(database, s1, 2, 'Call 999 or 112 immediately, or ask a bystander to call.', 'Piga simu 999 au 112 mara moja, au omba mshuhudiaji apige simu.');
  await insertStep(database, s1, 3, 'Place heel of hand on centre of chest. Other hand on top, interlock fingers.', 'Weka kisigino cha mkono katikati ya kifua. Mkono mwingine juu, funga vidole.');
  await insertStep(database, s1, 4, 'Push down hard and fast — at least 5 cm deep, 100–120 times per minute.', 'Sukuma chini kwa nguvu na haraka — angalau sm 5, mara 100–120 kwa dakika.');
  await insertStep(database, s1, 5, 'After 30 compressions, give 2 rescue breaths if trained. If not, continue compressions only.', 'Baada ya misukumo 30, toa pumzi 2 ukijua jinsi. Ikiwa la, endelea misukumo tu.');
  await insertStep(database, s1, 6, 'Continue until person breathes, emergency services arrive, or you are too exhausted.', 'Endelea hadi mtu apumue, huduma za dharura zifike, au uchoke mno.');
  await insertResource(database, s1, 'AED Defibrillator', 'Not substitutable — use CPR only if unavailable. Found in airports, malls, large offices.', 'Get AED as soon as possible — dramatically improves survival');
  await insertResource(database, s1, 'CPR Face Shield', 'Cloth with a small hole, or skip rescue breaths and do compressions only', 'Compression-only CPR is still effective');

  // S2: Heart Attack
  const s2 = await insertScenario(database, 1, 'Heart Attack',
    'heart attack,chest pain,angina,arm pain,jaw pain,sweating,myocardial',
    'red', 'Chest pain, shortness of breath, arm pain. Call 999 immediately.');
  await insertStep(database, s2, 1, 'Call 999 or 112 immediately. Do not leave the person alone.', 'Piga simu 999 au 112 mara moja. Usimwacha mtu peke yake.');
  await insertStep(database, s2, 2, 'Help them sit in a comfortable position — half-sitting with knees bent eases breathing.', 'Msaidie kukaa vizuri — kukaa nusu huku magoti yamepinda husaidia kupumua.');
  await insertStep(database, s2, 3, 'Give 300 mg aspirin to chew (not swallow whole) if available and not allergic.', 'Mpe aspirini 300 mg itafunwe (si kumeza yote) ikiwa inapatikana na hana mzio.');
  await insertStep(database, s2, 4, 'Loosen tight clothing around chest, neck, and waist.', 'Legeza nguo ngumu karibu na kifua, shingo, na kiuno.');
  await insertStep(database, s2, 5, 'Monitor breathing. If they stop breathing, begin CPR immediately.', 'Fuatilia kupumua. Wakiacha kupumua, anza CPR mara moja.');
  await insertResource(database, s2, 'Aspirin 300mg', 'Any regular aspirin tablet — not paracetamol or ibuprofen', 'Only give if person is conscious and not allergic');
  await insertResource(database, s2, 'Comfortable seating', 'Folded clothing, cushion, or wall support to keep person upright', 'Do not lay flat unless unconscious');

  // S3: Stroke
  const s3 = await insertScenario(database, 1, 'Stroke',
    'stroke,brain,face drooping,arm weakness,speech,FAST,paralysis,slurred',
    'red', 'Use the FAST test. Every minute counts — call 999 immediately.');
  await insertStep(database, s3, 1, 'Use the FAST test: Face drooping? Arm weakness? Speech slurred? Time to call 999.', 'Tumia mtihani wa FAST: Uso kushuka? Mkono dhaifu? Maneno kupotoka? Wakati wa kupiga simu 999.');
  await insertStep(database, s3, 2, 'Call 999 or 112 immediately. Note the exact time symptoms started.', 'Piga simu 999 au 112 mara moja. Andika wakati halisi dalili zilipoanza.');
  await insertStep(database, s3, 3, 'Keep them still and calm. Do NOT give food, drink, or aspirin.', 'Mwache atulie. USIMPE chakula, maji, au aspirini.');
  await insertStep(database, s3, 4, 'If unconscious but breathing, place in recovery position on their side.', 'Ikiwa amepoteza fahamu lakini anapumua, weka nafsi ya kupona upande.');
  await insertStep(database, s3, 5, 'Do NOT let them fall asleep. Keep them awake and talking if possible.', 'USIMRUHUSU alale. Mweke macho na akizungumza ikiwezekana.');
  await insertResource(database, s3, 'Recovery position support', 'Rolled clothing or blanket to support person on their side', 'Never leave a stroke patient alone');

  // S4: Asthma Attack
  const s4 = await insertScenario(database, 1, 'Asthma Attack',
    'asthma,wheeze,breathing,inhaler,bronchospasm,blue lips,shortness of breath',
    'amber', 'Severe wheezing, difficulty breathing. Help them use their inhaler immediately.');
  await insertStep(database, s4, 1, 'Help the person sit upright and lean slightly forward. Do not lie them down.', 'Msaidie kukaa wima na kuinamia kidogo mbele. Usimkalie chini.');
  await insertStep(database, s4, 2, 'Help them use their reliever inhaler (usually blue) — 1 puff every 30–60 seconds, up to 10 puffs.', 'Msaidie kutumia dawa yao ya pumzi (kawaida bluu) — puff moja kila sekunde 30–60, hadi puff 10.');
  await insertStep(database, s4, 3, 'If no improvement after 10 puffs, or no inhaler available, call 999 immediately.', 'Ikiwa hakuna uboreshaji baada ya puff 10, au hakuna dawa ya pumzi, piga simu 999 mara moja.');
  await insertStep(database, s4, 4, 'Stay with the person. Keep them calm — anxiety worsens an asthma attack.', 'Kaa na mtu. Mwache atulie — wasiwasi hufanya mashambulizi ya pumu kuwa mabaya zaidi.');
  await insertStep(database, s4, 5, 'Repeat inhaler doses every 15 minutes while waiting for emergency services.', 'Rudia dawa ya pumzi kila dakika 15 ukingoja huduma za dharura.');
  await insertResource(database, s4, 'Reliever inhaler', 'No substitute — use a spacer device if available to improve delivery', 'A homemade spacer: plastic bottle with mouthpiece hole');

  // S5: Drowning
  const s5 = await insertScenario(database, 1, 'Drowning',
    'drowning,water,swimming,submerged,not breathing,rescue,lake,river,pool',
    'red', 'Remove from water safely, check breathing, begin CPR if needed.');
  await insertStep(database, s5, 1, 'Remove person from water safely. Do NOT put yourself at risk — use a rope, pole, or float.', 'Toa mtu majini salama. USIJIWEKE hatarini — tumia kamba, nguzo, au chombo cha kuelea.');
  await insertStep(database, s5, 2, 'Call 999 or 112. Lay person on their back on a flat surface.', 'Piga simu 999 au 112. Mlaze mtu mgongoni kwenye uso wa tambarare.');
  await insertStep(database, s5, 3, 'Check for breathing. If not breathing, begin CPR: 30 compressions, then 2 rescue breaths.', 'Angalia kupumua. Ikiwa hapumui, anza CPR: misukumo 30, kisha pumzi 2.');
  await insertStep(database, s5, 4, 'Continue CPR until person breathes or emergency services arrive.', 'Endelea CPR hadi mtu apumue au huduma za dharura zifike.');
  await insertStep(database, s5, 5, 'If breathing, place in recovery position. Keep them warm — drowning causes hypothermia.', 'Ikiwa anapumua, weka nafsi ya kupona. Mwache awe na joto — kuzama husababisha baridi mwilini.');
  await insertResource(database, s5, 'Rescue equipment', 'Rope, belt tied together, long branch, or throw a plastic bottle on a string', 'Never enter water without training');
  await insertResource(database, s5, 'Dry blanket', 'Dry clothing, curtain, or any dry fabric to prevent hypothermia', 'Hypothermia is a serious risk after drowning');

  // ════════════════════════════════════════════════════════════════════════════
  // CAT 2: BLEEDING & WOUNDS (category_id = 2)
  // ════════════════════════════════════════════════════════════════════════════

  // S6: Severe Bleeding
  const s6 = await insertScenario(database, 2, 'Severe Bleeding',
    'bleeding,blood,cut,wound,severe bleeding,hemorrhage,gushing',
    'red', 'Apply direct pressure immediately to slow and stop the bleeding.');
  await insertStep(database, s6, 1, 'Wear gloves if available. Use a plastic bag or ask victim to apply pressure themselves.', 'Vaa glavu ikiwa zinapatikana. Tumia mfuko wa plastiki au mwambie mtu ashinikize mwenyewe.');
  await insertStep(database, s6, 2, 'Apply firm, direct pressure to the wound with a clean cloth or bandage.', 'Shinikiza moja kwa moja kwenye jeraha kwa nguo safi au bandeji.');
  await insertStep(database, s6, 3, 'If blood soaks through, add MORE material on top. Do NOT remove the first layer.', 'Ikiwa damu inapita, ongeza nyenzo zaidi juu. USIONDOE safu ya kwanza.');
  await insertStep(database, s6, 4, 'For limb wounds, raise the injured limb above heart level while maintaining pressure.', 'Kwa majeraha ya miguu/mikono, inua kiungo juu ya moyo ukiendelea kushikilia.');
  await insertStep(database, s6, 5, 'If bleeding is life-threatening from a limb, apply a tourniquet 5–7 cm above the wound.', 'Ikiwa damu ni hatari kwa maisha kutoka kiungo, weka kizibo sm 5–7 juu ya jeraha.');
  await insertStep(database, s6, 6, 'Note the time and call 999 or 112. Keep the person warm and calm.', 'Angalia wakati na piga simu 999 au 112. Mwache mtu awe na joto na utulivu.');
  await insertResource(database, s6, 'Sterile bandage', 'Clean cloth, shirt, sanitary pad, necktie', 'Pressure matters more than sterility in an emergency');
  await insertResource(database, s6, 'Tourniquet', 'Belt, necktie, or strip of cloth tied tightly — insert a stick and twist to tighten', 'Mark time of application on skin if possible');
  await insertResource(database, s6, 'Medical gloves', 'Plastic bags over hands, or ask victim to self-apply pressure', 'Protect yourself from bloodborne infection');

  // S7: Nosebleed
  const s7 = await insertScenario(database, 2, 'Nosebleed',
    'nosebleed,nose,epistaxis,blood nose',
    'green', 'Lean forward and pinch the soft part of the nose. Most nosebleeds stop within 10–15 minutes.');
  await insertStep(database, s7, 1, 'Have the person sit upright and lean slightly forward. Do NOT tilt the head back.', 'Mwache mtu akae wima na kuinamia kidogo mbele. USIINAME kichwa nyuma.');
  await insertStep(database, s7, 2, 'Pinch the soft lower part of the nose firmly. Breathe through the mouth.', 'Bana sehemu laini ya chini ya pua kwa nguvu. Pumua kupitia mdomo.');
  await insertStep(database, s7, 3, 'Hold for 10 minutes without releasing. Repeat if still bleeding.', 'Shikilia kwa dakika 10 bila kuacha. Rudia ikiwa bado inatoka damu.');
  await insertStep(database, s7, 4, 'Seek medical help if bleeding does not stop after 30 minutes or if on blood thinners.', 'Tafuta msaada wa daktari ikiwa damu haisimami baada ya dakika 30.');
  await insertResource(database, s7, 'Ice pack', 'Cold wet cloth on bridge of nose and back of neck', 'Helps constrict blood vessels');

  // S8: Puncture Wound
  const s8 = await insertScenario(database, 2, 'Puncture Wound',
    'puncture,stab,nail,impalement,deep wound,infection',
    'amber', 'Deep stab or nail wound with infection risk. Do not remove deeply embedded objects.');
  await insertStep(database, s8, 1, 'Do NOT remove a deeply embedded object — it may be controlling bleeding.', 'USIONDOE kitu kilichoingia kina — kinaweza kudhibiti damu.');
  await insertStep(database, s8, 2, 'Apply gentle pressure around the wound (not on the object) to control bleeding.', 'Shinikiza polepole karibu na jeraha (si kwenye kitu) kudhibiti damu.');
  await insertStep(database, s8, 3, 'Clean a shallow wound with clean water. Do not use hydrogen peroxide on deep wounds.', 'Safisha jeraha dogo na maji safi. Usitumie peroksidi ya hidrojeni kwenye majeraha ya kina.');
  await insertStep(database, s8, 4, 'Cover with a clean dressing and seek medical care. Tetanus risk is high with punctures.', 'Funika na bandeji safi na tafuta matibabu. Hatari ya pepopunda ni kubwa na majeraha ya kuchomwa.');

  // S9: Wound Infection Signs
  const s9 = await insertScenario(database, 2, 'Wound Infection',
    'infection,wound,pus,redness,swelling,fever,sepsis,cellulitis',
    'amber', 'Redness, swelling, pus — signs of wound infection. Seek medical care promptly.');
  await insertStep(database, s9, 1, 'Signs of infection: increasing redness, warmth, swelling, pus, red streaks, fever.', 'Dalili za maambukizi: uwekundu unaoongezeka, joto, uvimbe, usaha, mistari nyekundu, homa.');
  await insertStep(database, s9, 2, 'Clean the wound gently with soap and clean water. Remove any visible debris.', 'Safisha jeraha kwa upole na sabuni na maji safi. Ondoa uchafu unaoonekana.');
  await insertStep(database, s9, 3, 'Apply antibiotic ointment if available and cover with a sterile dressing.', 'Paka marashi ya antibiotic ikiwa inapatikana na funika na bandeji ya kuzaa.');
  await insertStep(database, s9, 4, 'Seek medical care promptly — untreated wound infections can become sepsis.', 'Tafuta matibabu haraka — maambukizi ya jeraha yasiyotibiwa yanaweza kuwa sepsis.');

  // S10: Amputation
  const s10 = await insertScenario(database, 2, 'Amputation / Severed Limb',
    'amputation,severed,cut off,finger,hand,arm,leg,tourniquet',
    'red', 'Limb or digit severed. Control bleeding immediately and preserve the severed part.');
  await insertStep(database, s10, 1, 'Call 999 immediately. Control bleeding with firm direct pressure and a tourniquet if needed.', 'Piga simu 999 mara moja. Dhibiti damu kwa shinikizo la moja kwa moja na kizibo ikiwa inahitajika.');
  await insertStep(database, s10, 2, 'Do NOT try to reattach the severed part. Keep the victim still and warm.', 'USIJARIBU kuunganisha upya sehemu iliyokatika. Mwache mtu asikie na awe na joto.');
  await insertStep(database, s10, 3, 'Place the severed part in a clean plastic bag. Place that bag in a bag of ice water (not direct ice).', 'Weka sehemu iliyokatwa kwenye mfuko safi wa plastiki. Weka mfuko huo kwenye mfuko wa maji ya barafu.');
  await insertStep(database, s10, 4, 'Keep the patient lying down. Treat for shock — raise legs slightly if not injured.', 'Mwache mgonjwa alale. Tibu mshtuko — inua miguu kidogo ikiwa haijaumia.');
  await insertResource(database, s10, 'Sterile gauze', 'Cleanest available cloth or clothing for stump dressing', 'Apply firm pressure and do not release');
  await insertResource(database, s10, 'Ice packs for severed part', 'Zip-lock bag of ice water — never direct ice on the severed part', 'Cold preservation buys time for reimplantation');

  // ════════════════════════════════════════════════════════════════════════════
  // CAT 3: BURNS & SCALDS (category_id = 3)
  // ════════════════════════════════════════════════════════════════════════════

  // S11: Burns & Scalds
  const s11 = await insertScenario(database, 3, 'Burns & Scalds',
    'burn,scald,fire,hot water,flame,chemical,blister,skin',
    'amber', 'Cool the burn under cool running water for at least 20 minutes immediately.');
  await insertStep(database, s11, 1, 'Remove the person from the heat source. Remove jewellery and clothing near the burn unless stuck to skin.', 'Ondoa mtu kutoka chanzo cha joto. Ondoa vito na nguo karibu na mchomo isipokuwa zimeungana na ngozi.');
  await insertStep(database, s11, 2, 'Cool the burn under cool (NOT cold/ice) running water for at least 20 minutes.', 'Poza mchomo chini ya maji baridi (SI barafu) yanayotiririka kwa angalau dakika 20.');
  await insertStep(database, s11, 3, 'Do NOT apply toothpaste, butter, oil, or ice. These make burns worse.', 'USITUMIE dawa ya meno, siagi, mafuta, au barafu. Hizi hufanya michomo kuwa mbaya zaidi.');
  await insertStep(database, s11, 4, 'Cover the burn loosely with clean non-fluffy material — cling film or a clean plastic bag works well.', 'Funika mchomo kwa upole na nyenzo safi — plastiki ya chakula au mfuko safi wa plastiki.');
  await insertStep(database, s11, 5, 'For large, deep, or facial burns — call 999 or 112. Do not burst blisters.', 'Kwa michomo mikubwa, ya kina, au ya uso — piga simu 999 au 112. Usipasue malengelenge.');
  await insertResource(database, s11, 'Sterile burn dressing', 'Clean plastic bag, cling film, or damp cool cloth', 'Never use fluffy or adhesive materials on burns');
  await insertResource(database, s11, 'Cool running water', 'Bottled water poured slowly over burn for 20+ minutes', 'Do not use ice or ice-cold water');

  // S12: Chemical Burn
  const s12 = await insertScenario(database, 3, 'Chemical Burn',
    'chemical,burn,acid,alkali,caustic,eye,skin,industrial',
    'amber', 'Skin or eye contact with chemical. Rinse with large amounts of water for 20+ minutes.');
  await insertStep(database, s12, 1, 'Remove the person from the chemical source. Brush off any dry chemical before rinsing.', 'Ondoa mtu kutoka chanzo cha kemikali. Piga kemikali yoyote kavu kabla ya kusafisha.');
  await insertStep(database, s12, 2, 'Rinse with large amounts of cool water for at least 20 minutes. Remove contaminated clothing.', 'Osha na maji mengi baridi kwa angalau dakika 20. Ondoa nguo zilizochafuliwa.');
  await insertStep(database, s12, 3, 'For eye exposure, flush eye with clean water for 20 minutes. Remove contact lenses first.', 'Kwa macho yaliyogusana, safisha jicho na maji safi kwa dakika 20. Ondoa lenzi za mawasiliano kwanza.');
  await insertStep(database, s12, 4, 'Call Poison Control (0800721210) or 999. Take the chemical container to the hospital.', 'Piga simu Udhibiti wa Sumu (0800721210) au 999. Chukua chombo cha kemikali hospitalini.');

  // S13: Electrical Burn
  const s13 = await insertScenario(database, 3, 'Electrical Burn',
    'electrical,electric,shock,burn,lightning,current,wire,outlet',
    'red', 'Burn from electric shock. Do NOT touch until power is off.');
  await insertStep(database, s13, 1, 'Do NOT touch the person until the power source is off. Switch off mains or move source with dry non-conducting object.', 'USIMGUSE mtu hadi chanzo cha umeme kimezimwa. Zima umeme au sogeza chanzo na kitu kisicho na uendeshaji.');
  await insertStep(database, s13, 2, 'Call 999. Electrical injuries cause internal damage not visible externally.', 'Piga simu 999. Majeraha ya umeme husababisha uharibifu wa ndani ambao hauonekani nje.');
  await insertStep(database, s13, 3, 'If not breathing, begin CPR. Electrical burns frequently cause cardiac arrest.', 'Ikiwa hapumui, anza CPR. Michomo ya umeme husababisha msimamo wa moyo mara nyingi.');
  await insertStep(database, s13, 4, 'Treat visible burns with cool water. Watch for delayed effects — confusion, seizures, heart irregularity.', 'Tibu michomo inayoonekana na maji baridi. Angalia athari za baadaye — kuchanganyikiwa, mshtuko, moyo usio wa kawaida.');

  // S14: Sunburn
  const s14 = await insertScenario(database, 3, 'Sunburn',
    'sunburn,sun,UV,blister,skin,peeling,radiation',
    'green', 'Severe sunburn. Move out of the sun and cool the skin.');
  await insertStep(database, s14, 1, 'Move person out of the sun immediately. Get them into a cool, shaded area.', 'Mwondoe mtu kutoka juani mara moja. Mwingize mahali pa baridi na kivuli.');
  await insertStep(database, s14, 2, 'Cool the skin with cool (not cold) water. Apply a cool damp cloth for comfort.', 'Poza ngozi na maji baridi (si barafu). Weka kitambaa cha baridi kilicholowa kwa faraja.');
  await insertStep(database, s14, 3, 'Apply aloe vera gel or a moisturiser. Do NOT apply butter or oil.', 'Paka jeli ya aloe vera au kremu ya unyevu. USIPAKE siagi au mafuta.');
  await insertStep(database, s14, 4, 'Give plenty of fluids to drink. Seek medical care if blistering is extensive.', 'Mpe vinywaji vingi. Tafuta matibabu ikiwa malengelenge ni mengi.');

  // ════════════════════════════════════════════════════════════════════════════
  // CAT 4: CHOKING (category_id = 4)
  // ════════════════════════════════════════════════════════════════════════════

  // S15: Choking Adult
  const s15 = await insertScenario(database, 4, 'Choking — Adult',
    'choking,cannot breathe,throat,swallowed,airway blocked,food stuck',
    'red', 'Airway blocked — cannot breathe or speak. Act immediately.');
  await insertStep(database, s15, 1, 'Ask "Are you choking?" If they cannot speak, cough, or breathe — act immediately.', 'Uliza "Je, unasongwa?" Ikiwa hawawezi kusema, kukohoa, au kupumua — tenda mara moja.');
  await insertStep(database, s15, 2, 'Stand behind the person. Give up to 5 firm back blows between the shoulder blades with your heel.', 'Simama nyuma ya mtu. Piga hadi mapigo 5 ya nguvu nyuma kati ya mabega.');
  await insertStep(database, s15, 3, 'If back blows fail, perform abdominal thrusts (Heimlich): wrap arms around their waist from behind.', 'Ikiwa mapigo ya nyuma hayafanyi kazi, fanya msukumo wa tumbo: zungusha mikono kiunoni mwao kutoka nyuma.');
  await insertStep(database, s15, 4, 'Make a fist. Place thumb-side against abdomen, just above navel and below ribcage.', 'Fanya ngumi. Weka kidole gumba upande wa tumbo, juu ya kitovu na chini ya mbavu.');
  await insertStep(database, s15, 5, 'Grasp fist with other hand. Pull sharply inward and upward up to 5 times.', 'Shika ngumi kwa mkono mwingine. Vuta kwa nguvu ndani na juu hadi mara 5.');
  await insertStep(database, s15, 6, 'Alternate 5 back blows and 5 thrusts until the object dislodges or person loses consciousness.', 'Badilisha mapigo 5 ya nyuma na misukumo 5 hadi kitu kitoke au mtu apoteze fahamu.');
  await insertResource(database, s15, 'Clear space to stand behind victim', 'Wall or chair back — position victim leaning forward', 'Do not perform abdominal thrusts on pregnant women or infants');

  // S16: Choking Infant
  const s16 = await insertScenario(database, 4, 'Choking — Infant (Under 1)',
    'choking,baby,infant,back blow,chest thrust,airway,newborn',
    'red', 'Baby choking — back blows and chest thrusts. Never do abdominal thrusts on infants.');
  await insertStep(database, s16, 1, 'Hold baby face-down on your forearm, head lower than chest. Support the head.', 'Shikilia mtoto uso chini kwenye mkono wako, kichwa chini kuliko kifua. Unga mkono wa kichwa.');
  await insertStep(database, s16, 2, 'Give 5 firm back blows between shoulder blades using the heel of your hand.', 'Piga mapigo 5 ya nguvu kati ya mabega ukitumia kisigino cha mkono wako.');
  await insertStep(database, s16, 3, 'Turn baby face-up on your thigh, head lower than body. Give 5 chest thrusts with 2 fingers on breastbone.', 'Mgeuze mtoto uso juu kwenye paja lako, kichwa chini ya mwili. Toa misukumo 5 ya kifua na vidole 2 kwenye mfupa wa kifua.');
  await insertStep(database, s16, 4, 'Alternate 5 back blows and 5 chest thrusts until object is dislodged.', 'Badilisha mapigo 5 ya nyuma na misukumo 5 ya kifua hadi kitu kitoke.');
  await insertStep(database, s16, 5, 'Call 999 if baby loses consciousness. Begin infant CPR if not breathing.', 'Piga simu 999 ikiwa mtoto anapoteza fahamu. Anza CPR ya mtoto mchanga ikiwa hapumui.');

  // S17: Choking Child
  const s17 = await insertScenario(database, 4, 'Choking — Child (1–8 yrs)',
    'choking,child,toddler,heimlich,back blow,airway,abdominal thrust',
    'red', 'Child choking — modified Heimlich manoeuvre for children.');
  await insertStep(database, s17, 1, 'Lean child forward. Give up to 5 firm back blows between shoulder blades.', 'Inama mtoto mbele. Piga hadi mapigo 5 ya nguvu kati ya mabega.');
  await insertStep(database, s17, 2, 'Kneel behind child. Make a fist and place above navel. Grasp with other hand.', 'Piga magoti nyuma ya mtoto. Fanya ngumi na uweke juu ya kitovu. Shika kwa mkono mwingine.');
  await insertStep(database, s17, 3, 'Pull sharply inward and upward — modified Heimlich. Up to 5 thrusts.', 'Vuta kwa nguvu ndani na juu — Heimlich iliorekebishwa. Hadi misukumo 5.');
  await insertStep(database, s17, 4, 'Alternate 5 back blows and 5 abdominal thrusts until object dislodges.', 'Badilisha mapigo 5 ya nyuma na misukumo 5 ya tumbo hadi kitu kitoke.');
  await insertStep(database, s17, 5, 'Call 999. Begin child CPR if the child loses consciousness and stops breathing.', 'Piga simu 999. Anza CPR ya mtoto ikiwa mtoto anapoteza fahamu na anacha kupumua.');

  // ════════════════════════════════════════════════════════════════════════════
  // CAT 5: FRACTURES & SPRAINS (category_id = 5)
  // ════════════════════════════════════════════════════════════════════════════

  // S18: Broken Bone
  const s18 = await insertScenario(database, 5, 'Broken Bone / Fracture',
    'fracture,broken,bone,arm,leg,pain,snap,sprain,dislocation',
    'amber', 'Bone broken — keep still and immobilise. Do not try to straighten.');
  await insertStep(database, s18, 1, 'Keep the injured area still. Do NOT try to straighten or realign the bone.', 'Shikilia eneo lililoomia lisogee. USIJARIBU kunyoosha mfupa.');
  await insertStep(database, s18, 2, 'Support the limb with a sling made from cloth. Apply a cold pack wrapped in cloth to reduce swelling.', 'Tegemeza kiungo kwa kombeo ya kitambaa. Weka pakiti ya baridi iliyofunikwa kupunguza uvimbe.');
  await insertStep(database, s18, 3, 'Seek medical care. Call 999 if the broken bone is through the skin or if there is heavy blood loss.', 'Tafuta matibabu. Piga simu 999 ikiwa mfupa umepasuka nje ya ngozi au ikiwa kuna kupoteza damu nyingi.');
  await insertResource(database, s18, 'Medical sling', 'Triangular bandage or tied shirt sleeves', null);
  await insertResource(database, s18, 'Splint', 'Rolled up newspaper, umbrella, or stiff cardboard bound with cloth', null);

  // S19: Sprained Ankle
  const s19 = await insertScenario(database, 5, 'Sprained Ankle',
    'sprain,ankle,twisted,swelling,RICE,joint,ligament',
    'green', 'Twisted ankle — use RICE: Rest, Ice, Compression, Elevation.');
  await insertStep(database, s19, 1, 'R — Rest: stop activity immediately. Do not walk on the injured ankle.', 'P — Pumzika: simama shughuli mara moja. Usiende kwa miguu kwenye mguu ulioumia.');
  await insertStep(database, s19, 2, 'I — Ice: apply ice wrapped in cloth for 20 minutes every 2 hours.', 'B — Barafu: weka barafu iliyofunikwa kwa dakika 20 kila masaa 2.');
  await insertStep(database, s19, 3, 'C — Compression: bandage the ankle firmly — not tightly — with an elastic bandage.', 'S — Shinikizo: bandeji mguu kwa nguvu — si kwa nguvu sana — na bandeji ya elastic.');
  await insertStep(database, s19, 4, 'E — Elevation: keep the ankle raised above heart level as much as possible.', 'I — Inua: weka mguu juu ya kiwango cha moyo iwezekanavyo.');
  await insertStep(database, s19, 5, 'Seek medical care if severe pain, cannot bear any weight, or numbness occurs.', 'Tafuta matibabu ikiwa maumivu makali, huwezi kubeba uzito wowote, au ganzi inatokea.');
  await insertResource(database, s19, 'Ice pack', 'Bag of frozen vegetables wrapped in cloth', 'Never apply ice directly to skin');
  await insertResource(database, s19, 'Elastic bandage', 'Torn strips of shirt or scarf wound firmly around ankle', null);

  // S20: Spinal Injury
  const s20 = await insertScenario(database, 5, 'Spinal / Back Injury',
    'spine,spinal,back,neck,paralysis,fall,injury,immobilise',
    'red', 'Suspected spinal injury — do NOT move the person. Call 999 immediately.');
  await insertStep(database, s20, 1, 'Do NOT move the person. Call 999 immediately. Stabilise the head and neck in the position found.', 'USIMSOGEZE mtu. Piga simu 999 mara moja. Immarisha kichwa na shingo katika nafsi iliyopatikana.');
  await insertStep(database, s20, 2, 'Keep the head and neck aligned with the spine. Do NOT bend or rotate the neck.', 'Weka kichwa na shingo kwa mstari na uti wa mgongo. USIPINDE au kuzungusha shingo.');
  await insertStep(database, s20, 3, 'If person must be moved (danger), use a log roll: keep head, neck, and body aligned.', 'Ikiwa mtu lazima asogezwe (hatari), tumia mzunguko wa guzo: weka kichwa, shingo, na mwili ukiwa pamoja.');
  await insertStep(database, s20, 4, 'If unconscious and not breathing, clear the airway carefully and begin CPR.', 'Ikiwa amepoteza fahamu na hapumui, safisha njia ya hewa kwa uangalifu na anza CPR.');

  // S21: Dislocated Joint
  const s21 = await insertScenario(database, 5, 'Dislocated Joint',
    'dislocation,dislocated,joint,shoulder,hip,pop,out of place',
    'amber', 'Joint forced out of position. Do NOT try to push it back in.');
  await insertStep(database, s21, 1, 'Do NOT try to push the joint back in. This can cause further damage.', 'USIJARIBU kurudisha kiungo mahali pake. Hii inaweza kusababisha uharibifu zaidi.');
  await insertStep(database, s21, 2, 'Immobilise the joint in the position found using a sling or padding.', 'Immarisha kiungo katika nafsi iliyopatikana ukitumia kombeo au padi.');
  await insertStep(database, s21, 3, 'Apply ice wrapped in cloth to reduce swelling and pain.', 'Weka barafu iliyofunikwa kupunguza uvimbe na maumivu.');
  await insertStep(database, s21, 4, 'Seek medical care promptly. Dislocations require professional reduction.', 'Tafuta matibabu haraka. Kutoka mahali pake kunahitaji kupunguzwa kwa kitaalamu.');

  // S22: Crush Injury
  const s22 = await insertScenario(database, 5, 'Crush Injury',
    'crush,trapped,heavy object,compression,limb,tourniquet',
    'red', 'Limb trapped under heavy object. Call 999 — do NOT remove object if trapped over 15 minutes.');
  await insertStep(database, s22, 1, 'Call 999 immediately. Do NOT remove the crushing object if trapped for more than 15 minutes.', 'Piga simu 999 mara moja. USIONDOE kitu kinachokandamiza ikiwa kimefungwa kwa zaidi ya dakika 15.');
  await insertStep(database, s22, 2, 'Warning: removing a long-term crush can cause fatal "crush syndrome" — toxic release into bloodstream.', 'Onyo: kuondoa kukandamiza kwa muda mrefu kunaweza kusababisha "ugonjwa wa kukata" — kutolewa kwa sumu damu.');
  await insertStep(database, s22, 3, 'Control any visible bleeding with direct pressure while waiting for paramedics.', 'Dhibiti damu yoyote inayoonekana na shinikizo la moja kwa moja ukingoja madaktari.');
  await insertStep(database, s22, 4, 'Keep person warm and calm. Treat for shock. Do not give fluids.', 'Mwache mtu awe na joto na utulivu. Tibu mshtuko. Usimpe vinywaji.');

  // ════════════════════════════════════════════════════════════════════════════
  // CAT 6: POISONING (category_id = 6)
  // ════════════════════════════════════════════════════════════════════════════

  // S23: Poisoning
  const s23 = await insertScenario(database, 6, 'Poisoning',
    'poisoning,toxic,ingested,swallowed,chemical,overdose,poison',
    'red', 'Ingested toxic substance. Call Poison Control or 999 — do NOT induce vomiting.');
  await insertStep(database, s23, 1, 'Call Poison Control (0800721210) or 999. Tell them what was taken, when, and how much.', 'Piga simu Udhibiti wa Sumu (0800721210) au 999. Waambie kilichomezwa, wakati, na kiasi.');
  await insertStep(database, s23, 2, 'Do NOT induce vomiting unless specifically told to by Poison Control.', 'USISABABISHE kutapika isipokuwa Udhibiti wa Sumu ukuambie.');
  await insertStep(database, s23, 3, 'If unconscious but breathing, place in recovery position on their side.', 'Ikiwa amepoteza fahamu lakini anapumua, weka nafsi ya kupona — muelekeze pembeni.');
  await insertStep(database, s23, 4, 'Keep the container or packaging to show medical staff what was ingested.', 'Weka chombo au ufungashaji uonyeshe wafanyakazi wa afya kilichomezwa.');
  await insertResource(database, s23, 'Poison container', 'Take a photo of the label if container must be left behind', 'Critical information for medical treatment');

  // S24: Carbon Monoxide Poisoning
  const s24 = await insertScenario(database, 6, 'Carbon Monoxide Poisoning',
    'carbon monoxide,CO,gas,exhaust,heater,headache,poisoning,fumes',
    'red', 'Get everyone out immediately. CO is odourless and invisible — call 999 from outside.');
  await insertStep(database, s24, 1, 'Get everyone out of the building immediately. Do NOT go back inside.', 'Toa watu wote nje ya jengo mara moja. USIRUDI ndani.');
  await insertStep(database, s24, 2, 'Call 999 from outside. Open windows and doors if safe to do so without re-entering.', 'Piga simu 999 kutoka nje. Fungua madirisha na milango ikiwa ni salama bila kuingia tena.');
  await insertStep(database, s24, 3, 'Move person to fresh air immediately. Lay them down and keep warm.', 'Mwongoza mtu kwenye hewa safi mara moja. Mlaze na mwache awe na joto.');
  await insertStep(database, s24, 4, 'Begin CPR if not breathing. All CO poisoning patients need 100% oxygen at hospital.', 'Anza CPR ikiwa hapumui. Wagonjwa wote wa CO wanahitaji oksijeni 100% hospitalini.');

  // S25: Alcohol Poisoning
  const s25 = await insertScenario(database, 6, 'Alcohol Poisoning',
    'alcohol,drunk,poisoning,overdose,breathing,unconscious,ethanol',
    'red', 'Unconscious after excessive alcohol. Call 999 — do not leave them alone.');
  await insertStep(database, s25, 1, 'Call 999. Do NOT leave an unconscious drunk person alone — risk of choking on vomit.', 'Piga simu 999. USIMWACHA mtu aliyepoteza fahamu peke yake — hatari ya kusongwa kwa matapiko.');
  await insertStep(database, s25, 2, 'Place in recovery position on their side so vomit cannot block the airway.', 'Weka nafsi ya kupona upande wao ili matapiko yasizibe njia ya hewa.');
  await insertStep(database, s25, 3, 'Keep them warm. Monitor breathing continuously.', 'Mwache awe na joto. Fuatilia kupumua kila wakati.');
  await insertStep(database, s25, 4, 'Do NOT give coffee, food, or water. Do NOT put them in a cold shower.', 'USIMPE kahawa, chakula, au maji. USIMUEKE kwenye bafu la baridi.');

  // S26: Drug Overdose
  const s26 = await insertScenario(database, 6, 'Drug Overdose',
    'overdose,drugs,medication,pills,opioid,paracetamol,aspirin,naloxone',
    'red', 'Too much medication or drugs taken. Call 999 immediately.');
  await insertStep(database, s26, 1, 'Call 999 immediately. Tell them what drug was taken if known.', 'Piga simu 999 mara moja. Waambie dawa iliyochukuliwa ikiwa inajulikana.');
  await insertStep(database, s26, 2, 'If unconscious but breathing, place in recovery position. Monitor breathing constantly.', 'Ikiwa amepoteza fahamu lakini anapumua, weka nafsi ya kupona. Fuatilia kupumua kila wakati.');
  await insertStep(database, s26, 3, 'Begin CPR if breathing stops. For suspected opioid overdose, Naloxone (if available) reverses effects.', 'Anza CPR ikiwa kupumua kunakoma. Kwa overdose ya opioid inayoshukiwa, Naloxone (ikiwa inapatikana) inabadilisha athari.');
  await insertStep(database, s26, 4, 'Keep the person awake and talking if conscious. Do not leave them.', 'Mwache mtu awe macho na azungumze ikiwa ana fahamu. Usimwacha.');

  // ════════════════════════════════════════════════════════════════════════════
  // CAT 7: SNAKE & ANIMAL BITES (category_id = 7)
  // ════════════════════════════════════════════════════════════════════════════

  // S27: Snake Bite
  const s27 = await insertScenario(database, 7, 'Snake Bite',
    'snake,bite,venom,poison,fang,reptile',
    'red', 'Keep calm and still. Get to hospital immediately — antivenom is the only cure.');
  await insertStep(database, s27, 1, 'Move the person away from the snake. Do NOT attempt to catch or kill the snake.', 'Ondoa mtu mbali na nyoka. USIJARIBU kukamata au kuua nyoka.');
  await insertStep(database, s27, 2, 'Keep the person calm and as still as possible. Movement speeds up venom spread.', 'Mwache mtu awe na utulivu na asimame iwezekanavyo. Harakati huharakisha kuenea kwa sumu.');
  await insertStep(database, s27, 3, 'Remove watches, rings, and tight clothing near the bite before swelling begins.', 'Ondoa saa, pete, na nguo ngumu karibu na meno kabla ya kuvimba kuanza.');
  await insertStep(database, s27, 4, 'Immobilise the bitten limb below heart level using a splint or sling.', 'Simamisha kiungo kilichoumwa chini ya kiwango cha moyo ukitumia gogo au kamba ya nguo.');
  await insertStep(database, s27, 5, 'Do NOT cut the wound, suck the venom, apply a tourniquet, or apply ice.', 'USIKATE jeraha, usifyonze sumu, usiweke kizibo, au usiweke barafu.');
  await insertStep(database, s27, 6, 'Get to hospital immediately. If safe, photograph the snake for identification.', 'Nenda hospitalini mara moja. Ikiwa salama, piga picha nyoka kwa utambuzi.');
  await insertResource(database, s27, 'Splint', 'Straight stick, rolled newspaper, or magazine bound with cloth strips', 'Keep limb immobile and below heart level');
  await insertResource(database, s27, 'Sling', 'Strip of clothing, scarf, or belt to support the arm', 'Antivenom only available at hospital — get there fast');

  // S28: Dog Bite
  const s28 = await insertScenario(database, 7, 'Dog Bite / Animal Bite',
    'dog bite,animal bite,rabies,wound,infection,tetanus,dog,cat',
    'amber', 'Deep wound from dog or animal. Wash thoroughly and seek medical care for rabies risk.');
  await insertStep(database, s28, 1, 'Get away from the animal. Wash wound thoroughly with soap and water for 15 minutes.', 'Toka mbali na mnyama. Osha jeraha vizuri na sabuni na maji kwa dakika 15.');
  await insertStep(database, s28, 2, 'Apply direct pressure to control bleeding. Cover with a clean dressing.', 'Shinikiza moja kwa moja kudhibiti damu. Funika na bandeji safi.');
  await insertStep(database, s28, 3, 'Seek medical care promptly — tetanus and rabies risk require professional assessment.', 'Tafuta matibabu haraka — hatari ya pepopunda na kichaa cha mbwa zinahitaji tathmini ya kitaalamu.');
  await insertStep(database, s28, 4, 'Note the animal: vaccinated dog? Wild animal? This affects post-exposure treatment.', 'Kumbuka mnyama: mbwa aliyechanjwa? Mnyama wa porini? Hii inaathiri matibabu baada ya mfiduo.');

  // S29: Scorpion Sting
  const s29 = await insertScenario(database, 7, 'Scorpion Sting',
    'scorpion,sting,venom,nge,numbness,pain',
    'amber', 'Scorpion sting with pain or numbness. Seek medical care — children and elderly at higher risk.');
  await insertStep(database, s29, 1, 'Stay calm. Do NOT squeeze or puncture the sting site.', 'Tulia. USIBANE au kuchoma mahali pa kuumwa.');
  await insertStep(database, s29, 2, 'Wash the sting site with soap and water. Apply a cool compress for pain.', 'Osha mahali pa kuumwa na sabuni na maji. Weka compress baridi kwa maumivu.');
  await insertStep(database, s29, 3, 'Seek medical care. Children and elderly are at higher risk of serious reaction.', 'Tafuta matibabu. Watoto na wazee wana hatari kubwa zaidi ya athari kali.');
  await insertStep(database, s29, 4, 'Call 999 if there is difficulty breathing, chest pain, or spreading numbness.', 'Piga simu 999 ikiwa kuna ugumu wa kupumua, maumivu ya kifua, au ganzi inayoenea.');

  // S30: Bee / Wasp Sting
  const s30 = await insertScenario(database, 7, 'Bee / Wasp Sting',
    'bee,wasp,sting,insect,allergy,swelling,stinger,anaphylaxis',
    'green', 'Bee or wasp sting. Remove stinger, cool the area, and monitor for allergic reaction.');
  await insertStep(database, s30, 1, 'Remove the stinger if visible — scrape sideways with a card or fingernail. Do NOT squeeze.', 'Ondoa mkuki ikiwa unaonekana — kuna kwa upande na kadi au kidole. USIBANE.');
  await insertStep(database, s30, 2, 'Wash the area with soap and water. Apply a cool compress to reduce pain and swelling.', 'Osha eneo na sabuni na maji. Weka compress baridi kupunguza maumivu na uvimbe.');
  await insertStep(database, s30, 3, 'Take antihistamine for mild swelling and itching. Monitor for signs of anaphylaxis.', 'Chukua antihistamine kwa uvimbe mdogo na kuwasha. Angalia ishara za anaphylaxis.');
  await insertStep(database, s30, 4, 'Call 999 immediately if throat swells, difficulty breathing, or dizziness — this is anaphylaxis.', 'Piga simu 999 mara moja ikiwa koo inavimba, ugumu wa kupumua, au kizunguzungu — hii ni anaphylaxis.');

  // ════════════════════════════════════════════════════════════════════════════
  // CAT 8: SEIZURES (category_id = 8)
  // ════════════════════════════════════════════════════════════════════════════

  // S31: Seizure
  const s31 = await insertScenario(database, 8, 'Seizure / Epileptic Fit',
    'seizure,epilepsy,convulsion,fit,shaking,unconscious,febrile',
    'amber', 'Protect from injury. Do NOT restrain or put anything in their mouth.');
  await insertStep(database, s31, 1, 'Stay calm. Time the seizure. Do NOT restrain the person.', 'Tulia. Angalia muda wa mshtuko. USIMZUIE mtu.');
  await insertStep(database, s31, 2, 'Clear the area of hard or sharp objects. Place something soft under their head.', 'Ondoa vitu vikali au vyenye ncha karibu. Weka kitu laini chini ya kichwa chao.');
  await insertStep(database, s31, 3, 'Do NOT put anything in their mouth. They cannot swallow their tongue.', 'USIWEKE kitu chochote kinywani mwao. Hawawezi kumeza ulimi wao.');
  await insertStep(database, s31, 4, 'When the seizure stops, roll them gently on their side (recovery position).', 'Baada ya mshtuko kukoma, vigeuze polepole upande (nafsi ya kupona).');
  await insertStep(database, s31, 5, 'Call 999 if the seizure lasts more than 5 minutes, or if another seizure follows.', 'Piga simu 999 ikiwa mshtuko unaendelea zaidi ya dakika 5, au ikiwa mshtuko mwingine unafuata.');
  await insertResource(database, s31, 'Head cushion', 'Folded jacket, blanket, bag, or your own hands', 'Priority is preventing head injury');
  await insertResource(database, s31, 'Timing device', 'Any phone clock or watch to time the seizure duration', 'Tell paramedics exactly how long it lasted');

  // S32: Febrile Convulsion
  const s32 = await insertScenario(database, 8, 'Febrile Convulsion (Child)',
    'febrile,convulsion,child,fever,seizure,baby,temperature,fit',
    'amber', 'Child has seizure due to high fever. Stay calm, protect child, cool gently.');
  await insertStep(database, s32, 1, 'Stay calm. Protect the child by removing hard objects nearby. Do NOT restrain.', 'Tulia. Linda mtoto kwa kuondoa vitu vikali karibu. USIMZUIE.');
  await insertStep(database, s32, 2, 'Do NOT put anything in the mouth or give anything to drink during the seizure.', 'USIWEKE kitu kinywani au umpe kitu cha kunywa wakati wa mshtuko.');
  await insertStep(database, s32, 3, 'Cool the child gently — remove excess clothing, use a tepid (not cold) damp cloth.', 'Poza mtoto polepole — ondoa nguo za ziada, tumia kitambaa cha maji ya uvuguvugu (si baridi).');
  await insertStep(database, s32, 4, 'After seizure, place child on side in recovery position. Monitor breathing.', 'Baada ya mshtuko, mweke mtoto upande kwenye nafsi ya kupona. Fuatilia kupumua.');
  await insertStep(database, s32, 5, 'Call 999 or go to hospital — always seek medical evaluation after a febrile convulsion.', 'Piga simu 999 au nenda hospitalini — daima tafuta tathmini ya kimatibabu baada ya degedege la homa.');

  // S33: Status Epilepticus
  const s33 = await insertScenario(database, 8, 'Status Epilepticus',
    'status epilepticus,prolonged seizure,5 minutes,continuous,emergency,benzodiazepine',
    'red', 'Seizure lasting more than 5 minutes — this is a medical emergency. Call 999.');
  await insertStep(database, s33, 1, 'Call 999 immediately. A seizure lasting more than 5 minutes requires emergency medication.', 'Piga simu 999 mara moja. Mshtuko unaodumu zaidi ya dakika 5 unahitaji dawa ya dharura.');
  await insertStep(database, s33, 2, 'Protect the person from injury. Do NOT restrain. Clear the area.', 'Linda mtu dhidi ya kuumia. USIMZUIE. Safisha eneo.');
  await insertStep(database, s33, 3, 'If prescribed, administer rectal diazepam or buccal midazolam if available.', 'Ikiwa imeagizwa, toa diazepam ya rectal au midazolam ya buccal ikiwa inapatikana.');
  await insertStep(database, s33, 4, 'Place in recovery position after movements stop. Monitor airway and breathing.', 'Weka nafsi ya kupona baada ya harakati kusimama. Fuatilia njia ya hewa na kupumua.');

  // ════════════════════════════════════════════════════════════════════════════
  // CAT 9: ALLERGIC REACTIONS (category_id = 9)
  // ════════════════════════════════════════════════════════════════════════════

  // S34: Anaphylaxis
  const s34 = await insertScenario(database, 9, 'Anaphylaxis / Severe Allergy',
    'allergy,anaphylaxis,allergic,reaction,swelling,hives,epinephrine',
    'red', 'Severe allergic reaction — airways may close. Use EpiPen and call 999 immediately.');
  await insertStep(database, s34, 1, 'Call 999 immediately. Anaphylaxis is life-threatening.', 'Piga simu 999 mara moja. Anaphylaxis ni hatari kwa maisha.');
  await insertStep(database, s34, 2, 'If an epinephrine auto-injector (EpiPen) is available, use it on the outer thigh immediately.', 'Ikiwa sindano ya epinephrine (EpiPen) inapatikana, itumie kwenye paja la nje mara moja.');
  await insertStep(database, s34, 3, 'Help them sit up if breathing is difficult, or lie down with legs raised if dizzy/faint.', 'Msaidie kukaa ikiwa anapata ugumu kupumua, au alale na miguu iliyoinuliwa ikiwa ana kizunguzungu.');
  await insertStep(database, s34, 4, 'If unconscious and not breathing, begin CPR.', 'Ikiwa amepoteza fahamu na hapumui, anza CPR.');
  await insertStep(database, s34, 5, 'Do NOT give antihistamines as the only treatment — they are too slow for anaphylaxis.', 'USITOE antihistamines peke yake kama matibabu — ni polepole sana kwa anaphylaxis.');
  await insertResource(database, s34, 'EpiPen / Epinephrine', 'No substitute — call 999 immediately if unavailable', 'Inject into outer thigh even through clothing');

  // S35: Mild Allergic Reaction
  const s35 = await insertScenario(database, 9, 'Mild Allergic Reaction',
    'allergy,hives,itching,rash,runny nose,mild,antihistamine',
    'green', 'Hives, itching, runny nose — no throat swelling. Take antihistamine and monitor closely.');
  await insertStep(database, s35, 1, 'Remove or avoid the trigger if known (food, insect, plant, medication).', 'Ondoa au epuka kichocheo ikiwa kinajulikana (chakula, wadudu, mmea, dawa).');
  await insertStep(database, s35, 2, 'Take an antihistamine tablet (e.g. cetirizine, loratadine) for hives and itching.', 'Chukua kidonge cha antihistamine (mf. cetirizine, loratadine) kwa upele na kuwasha.');
  await insertStep(database, s35, 3, 'Apply calamine lotion or cool compress to itchy skin areas.', 'Paka lotion ya calamine au compress baridi kwenye maeneo ya ngozi inayowasha.');
  await insertStep(database, s35, 4, 'Monitor closely. Call 999 immediately if throat swells, breathing changes, or dizziness occurs.', 'Angalia kwa makini. Piga simu 999 mara moja ikiwa koo inavimba, kupumua kunabadilika, au kizunguzungu kinatokea.');

  // S36: Eye Allergy / Chemical Splash
  const s36 = await insertScenario(database, 9, 'Eye Allergy / Chemical Splash',
    'eye,allergy,chemical,splash,irritant,burning,redness,flush',
    'amber', 'Eye contact with allergen or chemical. Flush with clean water for 20 minutes immediately.');
  await insertStep(database, s36, 1, 'Immediately flush the eye with clean water for at least 15–20 minutes.', 'Safisha jicho na maji safi mara moja kwa angalau dakika 15–20.');
  await insertStep(database, s36, 2, 'Remove contact lenses before flushing if possible.', 'Ondoa lenzi za mawasiliano kabla ya kusafisha ikiwezekana.');
  await insertStep(database, s36, 3, 'Do NOT rub the eye. Hold eyelids open during rinsing.', 'USISUGUE jicho. Shikilia kope wazi wakati wa kuosha.');
  await insertStep(database, s36, 4, 'Seek immediate medical attention. Bring the chemical container for identification.', 'Tafuta matibabu ya haraka. Chukua chombo cha kemikali kwa utambuzi.');

  // ════════════════════════════════════════════════════════════════════════════
  // CAT 10: ENVIRONMENTAL (category_id = 10)
  // ════════════════════════════════════════════════════════════════════════════

  // S37: Heatstroke
  const s37 = await insertScenario(database, 10, 'Heatstroke',
    'heatstroke,heat,exhaustion,sunstroke,hot,temperature,overheating',
    'red', 'Body dangerously overheated. Cool immediately and call 999.');
  await insertStep(database, s37, 1, 'Move the person to a cool, shaded area immediately.', 'Mwondoe mtu mahali pa baridi na kivuli mara moja.');
  await insertStep(database, s37, 2, 'Remove excess clothing. Fan them and apply cool damp cloths to neck, armpits, and groin.', 'Ondoa nguo za ziada. Wapiga upepo na weka vitambaa vya baridi shingoni, makwapani, na kinunduni.');
  await insertStep(database, s37, 3, 'Give cool water to drink if they are conscious and able to swallow.', 'Mpe maji baridi ya kunywa ikiwa ana fahamu na anaweza kumeza.');
  await insertStep(database, s37, 4, 'Do NOT give fluids if unconscious or having seizures.', 'USIPE maji akiwa amepoteza fahamu au ana mshtuko.');
  await insertStep(database, s37, 5, 'Call 999 if temperature remains high, they lose consciousness, or stop sweating despite heat.', 'Piga simu 999 ikiwa joto linabaki juu, wanapoteza fahamu, au wanaacha kutoka jasho.');
  await insertResource(database, s37, 'Ice packs', 'Wet cold cloths applied to neck, armpits, groin', 'These areas have large blood vessels — fastest cooling');

  // S38: Heat Exhaustion
  const s38 = await insertScenario(database, 10, 'Heat Exhaustion',
    'heat exhaustion,sweating,dizziness,weakness,pale,heat,dehydration',
    'amber', 'Heavy sweating, weakness, dizziness from heat. Move to cool area and rehydrate.');
  await insertStep(database, s38, 1, 'Move to a cool, shaded place. Have them lie down with legs raised.', 'Hama mahali pa baridi, chenye kivuli. Mwache alale na miguu iliyoinuliwa.');
  await insertStep(database, s38, 2, 'Give cool water or sports drink to sip. Replace lost salts with ORS if available.', 'Mpe maji baridi au kinywaji cha michezo kwa sips. Badilisha chumvi zilizopotea na ORS ikiwa inapatikana.');
  await insertStep(database, s38, 3, 'Apply cool wet cloths to skin. Fan the person.', 'Weka vitambaa vya baridi vilivyolowa kwenye ngozi. Mpige upepo mtu.');
  await insertStep(database, s38, 4, 'If not improving within 30 minutes, or person becomes confused, seek medical care.', 'Ikiwa haijaboreshwa ndani ya dakika 30, au mtu anachanganyikiwa, tafuta matibabu.');

  // S39: Hypothermia
  const s39 = await insertScenario(database, 10, 'Hypothermia',
    'hypothermia,cold,freezing,shivering,unconscious,temperature,exposure',
    'red', 'Body temperature dangerously low from cold. Warm slowly — call 999.');
  await insertStep(database, s39, 1, 'Move person to a warm, dry place. Remove wet clothing gently.', 'Mwongoza mtu mahali pa joto na kame. Ondoa nguo za mvua kwa upole.');
  await insertStep(database, s39, 2, 'Cover with blankets including head, leaving face clear. Use body heat to warm them.', 'Funika na mablanketi ikiwemo kichwa, ukiacha uso wazi. Tumia joto la mwili kuwapasha.');
  await insertStep(database, s39, 3, 'Give warm (not hot) sweet drinks if conscious and able to swallow.', 'Mpe vinywaji vya uvuguvugu (si moto) vyenye sukari ikiwa ana fahamu na anaweza kumeza.');
  await insertStep(database, s39, 4, 'Do NOT rub limbs — this can cause dangerous heart arrhythmia.', 'USISUGUE viungo — hii inaweza kusababisha ugonjwa wa moyo hatari.');
  await insertStep(database, s39, 5, 'Call 999. Severe hypothermia requires hospital rewarming.', 'Piga simu 999. Baridi kali mwilini inahitaji kupasha joto hospitalini.');
  await insertResource(database, s39, 'Thermal / space blanket', 'Layers of dry clothing, blankets, sleeping bag', 'Cover the head — most heat is lost from the head');

  // S40: Frostbite
  const s40 = await insertScenario(database, 10, 'Frostbite',
    'frostbite,frozen,cold,skin,numb,hands,feet,toes,fingers',
    'amber', 'Frozen skin and tissue from extreme cold. Do not rub or rewarm if refreezing risk.');
  await insertStep(database, s40, 1, 'Get out of the cold. Do NOT rub or massage frostbitten areas.', 'Toka nje ya baridi. USISUGUE au kupiga miili ya kuganda.');
  await insertStep(database, s40, 2, 'Do NOT rewarm if there is risk of refreezing — this causes more damage.', 'USIPASHE joto ikiwa kuna hatari ya kuganda tena — hii husababisha uharibifu zaidi.');
  await insertStep(database, s40, 3, 'If safe to rewarm: soak in warm (not hot) water at 37–39°C for 20–30 minutes.', 'Ikiwa ni salama kupasha joto: loweka kwenye maji ya uvuguvugu (si moto) 37–39°C kwa dakika 20–30.');
  await insertStep(database, s40, 4, 'Protect thawed areas — apply loose sterile bandages. Seek medical care.', 'Linda maeneo yaliyoyeyushwa — paka bandeji za kuzaa. Tafuta matibabu.');

  // S41: Lightning Strike
  const s41 = await insertScenario(database, 10, 'Lightning Strike',
    'lightning,strike,thunder,electrical,cardiac arrest,burn,shock',
    'red', 'Person struck by lightning — cardiac arrest possible. Call 999 and begin CPR if needed.');
  await insertStep(database, s41, 1, 'Ensure the scene is safe — lightning can strike twice. Move to shelter.', 'Hakikisha eneo ni salama — radi inaweza kupiga mara mbili. Hama mahali salama.');
  await insertStep(database, s41, 2, 'Call 999 immediately. Lightning strike victims often need CPR.', 'Piga simu 999 mara moja. Waathirika wa radi mara nyingi wanahitaji CPR.');
  await insertStep(database, s41, 3, 'Begin CPR if not breathing. It is safe to touch a lightning strike victim.', 'Anza CPR ikiwa hapumui. Ni salama kugusa mwathirika wa radi.');
  await insertStep(database, s41, 4, 'Treat burns, check for other injuries. All lightning victims need hospital evaluation.', 'Tibu michomo, angalia majeraha mengine. Waathirika wote wa radi wanahitaji tathmini ya hospitali.');

  // S42: Dehydration
  const s42 = await insertScenario(database, 10, 'Dehydration',
    'dehydration,fluid loss,dizziness,thirst,dry mouth,electrolytes,ORS',
    'amber', 'Severe fluid loss. Give ORS or improvised rehydration solution slowly.');
  await insertStep(database, s42, 1, 'Move to a cool area. Give oral rehydration solution (ORS) to sip slowly.', 'Hama mahali pa baridi. Mpe suluhisho la kunywa (ORS) kwa sips polepole.');
  await insertStep(database, s42, 2, 'ORS substitute: 1 litre clean water + 6 teaspoons sugar + half teaspoon salt.', 'Mbadala wa ORS: lita 1 ya maji safi + vijiko 6 vya sukari + nusu kijiko cha chumvi.');
  await insertStep(database, s42, 3, 'Avoid coffee, alcohol, and sugary drinks — they worsen dehydration.', 'Epuka kahawa, pombe, na vinywaji vyenye sukari — hupunguza maji zaidi.');
  await insertStep(database, s42, 4, 'Seek medical care if unconscious, very confused, no urination for 8+ hours, or infant.', 'Tafuta matibabu ikiwa amepoteza fahamu, anachanganyikiwa sana, hakuna mkojo kwa masaa 8+, au ni mtoto.');

  // ════════════════════════════════════════════════════════════════════════════
  // CAT 11: HEAD & NEUROLOGICAL (category_id = 11)
  // ════════════════════════════════════════════════════════════════════════════

  // S43: Head Injury
  const s43 = await insertScenario(database, 11, 'Head Injury / Concussion',
    'head,injury,concussion,trauma,unconscious,confusion,fall',
    'amber', 'Head trauma — keep still, monitor for danger signs, call 999 for significant injuries.');
  await insertStep(database, s43, 1, 'Keep the person still. Do NOT move them unless they are in immediate danger.', 'Mwache mtu asimame. USIMSOGEZE isipokuwa yupo katika hatari ya moja kwa moja.');
  await insertStep(database, s43, 2, 'If they are unconscious but breathing, place in recovery position. Support the head and neck.', 'Ikiwa amepoteza fahamu lakini anapumua, weka nafsi ya kupona. Unga mkono wa kichwa na shingo.');
  await insertStep(database, s43, 3, 'Apply gentle pressure to any scalp wound with a clean cloth. Do NOT remove embedded objects.', 'Shinikiza kwa upole kidonda chochote cha kichwa na nguo safi. USIONDOE vitu vilivyoingia fuani.');
  await insertStep(database, s43, 4, 'Watch for: loss of consciousness, vomiting, confusion, unequal pupils, weakness.', 'Angalia: kupoteza fahamu, kutapika, kuchanganyikiwa, wanafunzi wa macho tofauti, udhaifu.');
  await insertStep(database, s43, 5, 'Call 999 for any significant head injury. Never leave a concussed person alone.', 'Piga simu 999 kwa jeraha lolote kubwa la kichwa. Usimwacha peke yake mtu aliyepigwa kichwani.');

  // S44: Unconscious Person
  const s44 = await insertScenario(database, 11, 'Unconscious Person',
    'unconscious,fainted,unresponsive,passed out,collapsed,recovery position',
    'red', 'Person found unconscious with unknown cause. Check airway and breathing immediately.');
  await insertStep(database, s44, 1, 'Check for response — tap shoulders, shout. Check scene is safe.', 'Angalia jibu — piga mabega, piga kelele. Hakikisha eneo ni salama.');
  await insertStep(database, s44, 2, 'Call 999 immediately.', 'Piga simu 999 mara moja.');
  await insertStep(database, s44, 3, 'Open the airway: tilt head back gently, lift chin. Look, listen, and feel for breathing.', 'Fungua njia ya hewa: inama kichwa nyuma kwa upole, inua kidevu. Angalia, sikiliza, na hisi kupumua.');
  await insertStep(database, s44, 4, 'If breathing: place in recovery position on side. If not breathing: begin CPR.', 'Ikiwa anapumua: weka nafsi ya kupona upande. Ikiwa hapumui: anza CPR.');
  await insertStep(database, s44, 5, 'Monitor breathing and pulse until emergency services arrive.', 'Fuatilia kupumua na mapigo hadi huduma za dharura zifike.');

  // S45: Fainting
  const s45 = await insertScenario(database, 11, 'Fainting',
    'faint,fainting,syncope,dizzy,pale,passed out,vasovagal',
    'amber', 'Brief loss of consciousness. Lay flat, raise legs, ensure fresh air.');
  await insertStep(database, s45, 1, 'Lay person flat on their back. Raise legs 30 cm above heart level.', 'Mlaze mtu mgongoni. Inua miguu sm 30 juu ya kiwango cha moyo.');
  await insertStep(database, s45, 2, 'Loosen tight clothing around neck and waist. Ensure fresh air and ventilation.', 'Legeza nguo ngumu karibu na shingo na kiuno. Hakikisha hewa safi na uingizaji hewa.');
  await insertStep(database, s45, 3, 'Do NOT give anything to eat or drink until fully conscious.', 'USIMPE kitu cha kula au kunywa hadi ana fahamu kabisa.');
  await insertStep(database, s45, 4, 'Call 999 if person does not recover within 1 minute, has chest pain, or has seizures.', 'Piga simu 999 ikiwa mtu harejei ndani ya dakika 1, ana maumivu ya kifua, au ana mshtuko.');

  // S46: Eye Injury
  const s46 = await insertScenario(database, 11, 'Eye Injury',
    'eye,injury,object,scratch,foreign body,cornea,vision,trauma',
    'amber', 'Object in eye or cut to eye. Do not rub — flush with water and seek medical attention.');
  await insertStep(database, s46, 1, 'Do NOT rub the eye. Wash hands before touching near the eye.', 'USISUGUE jicho. Osha mikono kabla ya kugusa karibu na jicho.');
  await insertStep(database, s46, 2, 'For a foreign body: flush gently with clean water. Blink to help dislodge it.', 'Kwa kitu nje: osha kwa upole na maji safi. Konyeza kusaidia kuondoa.');
  await insertStep(database, s46, 3, 'Do NOT try to remove an object embedded in the eyeball.', 'USIJARIBU kuondoa kitu kilichoingia kwenye mboni ya jicho.');
  await insertStep(database, s46, 4, 'Cover with a clean, loosely fitting pad. Seek immediate medical attention.', 'Funika na pedi safi inayofaa kwa upole. Tafuta matibabu ya haraka.');

  // S47: Suspected Meningitis
  const s47 = await insertScenario(database, 11, 'Severe Headache / Suspected Meningitis',
    'headache,meningitis,thunderclap,stiff neck,photophobia,rash,neck',
    'red', 'Thunderclap headache, stiff neck, light sensitivity — possible meningitis. Call 999 immediately.');
  await insertStep(database, s47, 1, 'Call 999 immediately. This is a medical emergency.', 'Piga simu 999 mara moja. Hii ni dharura ya kimatibabu.');
  await insertStep(database, s47, 2, 'Watch for meningitis signs: stiff neck, dislike of bright light, rash that does not fade under a glass.', 'Angalia dalili za meningitis: shingo ngumu, kuchukia mwanga mkali, upele unaokaa hata chini ya glasi.');
  await insertStep(database, s47, 3, 'Keep the person in a quiet, dark room if light sensitivity is present.', 'Mwache mtu kwenye chumba cha utulivu na giza ikiwa ana unyeti wa mwanga.');
  await insertStep(database, s47, 4, 'Do NOT leave the person alone. Monitor level of consciousness.', 'USIMWACHA mtu peke yake. Fuatilia kiwango cha fahamu.');

  // S48: Diabetic Emergency
  const s48 = await insertScenario(database, 11, 'Diabetic Emergency',
    'diabetes,hypoglycemia,hyperglycemia,blood sugar,insulin,glucose,diabetic',
    'amber', 'Very low or high blood sugar — give sugar if conscious and able to swallow.');
  await insertStep(database, s48, 1, 'If conscious and able to swallow: give 15–20g fast-acting sugar (glucose gel, fruit juice, sugary drink, sweets).', 'Ikiwa ana fahamu na anaweza kumeza: mpe gramu 15–20 za sukari inayofanya kazi haraka.');
  await insertStep(database, s48, 2, 'Recheck after 15 minutes. Repeat sugar if still symptomatic.', 'Angalia tena baada ya dakika 15. Rudia sukari ikiwa bado ana dalili.');
  await insertStep(database, s48, 3, 'For high blood sugar: give water, not food. Seek medical care.', 'Kwa sukari ya damu juu: mpe maji, si chakula. Tafuta matibabu.');
  await insertStep(database, s48, 4, 'Call 999 if unconscious, seizure, or no improvement after sugar administration.', 'Piga simu 999 ikiwa amepoteza fahamu, ana mshtuko, au hakuna uboreshaji baada ya sukari.');
  await insertResource(database, s48, 'Glucose tablets', 'Sugar, honey, fruit juice, fizzy drink, sweets, or any sugary food', 'Do not give food or drink to unconscious person');

  // S49: Panic Attack
  const s49 = await insertScenario(database, 11, 'Panic Attack',
    'panic attack,anxiety,hyperventilate,chest tightness,fear,breathing,calm',
    'green', 'Extreme anxiety, rapid breathing, chest tightness. Stay calm and guide breathing.');
  await insertStep(database, s49, 1, 'Stay calm and speak reassuringly. Move to a quiet place if possible.', 'Tulia na uzungumze kwa utulivu. Hama mahali pa utulivu ikiwezekana.');
  await insertStep(database, s49, 2, 'Encourage slow, controlled breathing: breathe in for 4 counts, hold 4, out for 6.', 'Himiza kupumua polepole, kudhibitiwa: pumua ndani kwa hesabu 4, shikilia 4, toa kwa 6.');
  await insertStep(database, s49, 3, 'Reassure them that panic attacks are not dangerous and will pass.', 'Waambie kuwa mashambulizi ya wasiwasi si hatari na yatapita.');
  await insertStep(database, s49, 4, 'Seek medical care if this is the first episode or symptoms are unclear — rule out cardiac causes.', 'Tafuta matibabu ikiwa hii ni kipindi cha kwanza au dalili hazifahamiki — ondoa sababu za moyo.');

  // S50: Dental Emergency
  const s50 = await insertScenario(database, 11, 'Dental Emergency / Knocked-Out Tooth',
    'tooth,dental,knocked out,avulsion,pain,swelling,abscess,reimplant',
    'amber', 'Tooth knocked out — handle by crown only, store in milk, see dentist within 30 minutes.');
  await insertStep(database, s50, 1, 'Find the knocked-out tooth. Pick it up by the crown (white part) — do NOT touch the root.', 'Tafuta jino lililotoka. Lichukue kwa taji (sehemu nyeupe) — USIGUSE mzizi.');
  await insertStep(database, s50, 2, 'If dirty, rinse gently with milk or saline — do NOT scrub. Do NOT let it dry out.', 'Ikiwa ni chafu, osha kwa upole na maziwa au salini — USISAFISHE kwa nguvu. USIACHE likauke.');
  await insertStep(database, s50, 3, 'Best: place the tooth back in the socket immediately if possible. Otherwise store in milk.', 'Bora: weka jino nyuma kwenye shimo lake mara moja ikiwezekana. La sivyo weka kwenye maziwa.');
  await insertStep(database, s50, 4, 'See a dentist within 30 minutes — speed is critical for reimplantation success.', 'Mwone daktari wa meno ndani ya dakika 30 — kasi ni muhimu kwa mafanikio ya kurudisha jino.');

  console.log('All 50 scenarios seeded successfully.');
};

// ── Seed default settings ─────────────────────────────────────────────────────
const seedSettings = async (database) => {
  const existing = await database.getFirstAsync('SELECT COUNT(*) as count FROM user_settings');
  if (existing.count > 0) return;
  await database.execAsync(`INSERT INTO user_settings (language, tts_enabled) VALUES ('en', 1);`);
};

// ── Query helpers ─────────────────────────────────────────────────────────────
export const getCategories = async () => {
  const database = await getDB();
  return await database.getAllAsync('SELECT * FROM categories ORDER BY category_id');
};

export const getScenariosByCategory = async (categoryId) => {
  const database = await getDB();
  return await database.getAllAsync(
    'SELECT * FROM scenarios WHERE category_id = ? ORDER BY urgency_level ASC, title ASC',
    [categoryId]
  );
};

export const getScenarioById = async (scenarioId) => {
  const database = await getDB();
  return await database.getFirstAsync('SELECT * FROM scenarios WHERE scenario_id = ?', [scenarioId]);
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
  return await database.getAllAsync('SELECT * FROM imp_resources WHERE scenario_id = ?', [scenarioId]);
};

export const getSettings = async () => {
  const database = await getDB();
  return await database.getFirstAsync('SELECT * FROM user_settings LIMIT 1');
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
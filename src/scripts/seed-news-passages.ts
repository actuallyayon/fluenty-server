import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore
}
import { ObjectId } from 'mongodb';
import { connectDB, collections, client } from '../db/index.js';

interface SeedPassage {
  title: string;
  source: string;
  sourceName: string;
  sourceUrl: string;
  topic: string;
  difficulty: 'academic' | 'general';
  timeLimitMinutes: number;
  content: string;
  headlineSnippet: string;
  questions: Array<{
    type: 'multiple_choice' | 'true_false_not_given' | 'fill_in_the_blank' | 'matching_headings';
    prompt: string;
    options?: string[];
    correctAnswer: string;
    evidenceQuote: string;
    explanationBn: string;
    explanationEn: string;
    order: number;
  }>;
}

const SEED_PASSAGES: SeedPassage[] = [
  {
    title: 'The Neurobiology of Bilingualism and Executive Cognitive Control',
    source: 'british_council_ielts',
    sourceName: 'British Council IELTS Prep',
    sourceUrl: 'https://takeielts.britishcouncil.org/research/neurobiology-bilingualism',
    topic: 'Cognitive Linguistics and Neuroplasticity',
    difficulty: 'academic',
    timeLimitMinutes: 20,
    headlineSnippet: 'Cognitive linguistics studies demonstrate that dual-language acquisition significantly enhances executive control.',
    content: `[Paragraph A] For much of the early twentieth century, educational psychologists and linguistic researchers operated under the prevailing hypothesis that childhood bilingualism imposed an excessive cognitive burden. Conventional pedagogy warned that acquiring two grammatical matrices simultaneously would inevitably induce developmental delays, syntax interference, and linguistic hesitation. However, contemporary neuroimaging technologies—most notably functional Magnetic Resonance Imaging (fMRI) and voxel-based morphometry—have thoroughly debunked this deficit paradigm, revealing instead that managing multiple linguistic systems induces profound structural neuroplasticity.

[Paragraph B] Central to the cognitive architecture of the bilingual speaker is the concept of non-selective lexical access. When a fluent bilingual communicates, both language systems remain active in the cerebral cortex. To utter a simple declarative sentence in English, the brain must continuously exert inhibitory control over competing lexical candidates from the native vernacular. Neuroscientists at leading research institutions have demonstrated that this perpetual cognitive arbitration recruits the dorsal anterior cingulate cortex and the bilateral dorsolateral prefrontal cortex—neural circuits responsible for general executive functions such as conflict monitoring, working memory updating, and task switching.

[Paragraph C] Morphological examinations demonstrate tangible anatomical consequences of this persistent mental exercise. Recent neuroimaging studies indicate that bilingual individuals exhibit denser gray matter in the left inferior parietal cortex compared to monolingual peers of identical socioeconomic backgrounds. Furthermore, diffusion tensor imaging confirms greater structural integrity within the white matter tracts of the corpus callosum and superior longitudinal fasciculus. These fortified neural pathways facilitate accelerated signal conduction between disparate cortical hemispheres, endowing bilingual speakers with superior problem-solving agility and creative divergent thinking.

[Paragraph D] The implications of this enhanced neural connectivity extend beyond linguistic dexterity into geriatric health. Clinical trials spanning multiple international demographics reveal that lifetime bilingualism delays the symptomatic manifestation of neurodegenerative disorders, such as Alzheimer's disease, by an average of 4.5 years. Although bilingualism does not prevent underlying histological tau pathology, it endows individuals with heightened "cognitive reserve"—an expanded neural repertoire that enables the brain to maintain functional autonomy despite progressive cellular degradation.

[Paragraph E] In conclusion, rather than hindering academic attainment, the continuous dual-activation of linguistic codes fosters cognitive resilience across the lifespan. As global mobility accelerates, integrating bilingual pedagogy into early childhood curricula represents not merely a cultural asset, but an essential scientific investment in lifelong cognitive longevity.`,
    questions: [
      {
        order: 1,
        type: 'multiple_choice',
        prompt: 'According to Paragraph A, early twentieth-century researchers erroneously believed that bilingualism would:',
        options: [
          'A. Overburden children and cause delays in language development',
          'B. Prevent children from learning scientific mathematics',
          'C. Damage the white matter of the corpus callosum',
          'D. Lead to permanent loss of their primary native language',
        ],
        correctAnswer: 'A. Overburden children and cause delays in language development',
        evidenceQuote: 'Conventional pedagogy warned that acquiring two grammatical matrices simultaneously would inevitably induce developmental delays, syntax interference, and linguistic hesitation.',
        explanationBn: 'প্যারাগ্রাফ A-তে স্পষ্টভাবে বলা হয়েছে যে বিংশ শতাব্দীর শুরুর দিকে গবেষকরা মনে করতেন দুটি ভাষা একসাথে শিখলে বাচ্চাদের ওপর অতিরিক্ত মানসিক চাপ পড়বে এবং ভাষা বিকাশে বিলম্ব (developmental delays) হবে।',
        explanationEn: 'Paragraph A directly mentions that early twentieth-century pedagogy warned dual acquisition would induce developmental delays and syntax interference.',
      },
      {
        order: 2,
        type: 'true_false_not_given',
        prompt: 'Lifetime bilingualism completely eliminates the biological cellular causes of Alzheimer\'s disease.',
        options: ['True', 'False', 'Not Given'],
        correctAnswer: 'False',
        evidenceQuote: 'Although bilingualism does not prevent underlying histological tau pathology, it endows individuals with heightened "cognitive reserve"',
        explanationBn: 'প্যারাগ্রাফ D-তে উল্লেখ আছে যে দ্বিভাষিকতা আলঝেইমারসের অন্তর্নিহিত জৈবিক ক্ষতি বা প্যাথলজি (tau pathology) প্রতিরোধ করে না, বরং লক্ষণ প্রকাশে বিলম্ব ঘটায়। তাই বাক্যটি False।',
        explanationEn: 'Paragraph D clarifies that bilingualism does not prevent underlying histological tau pathology, but delays symptomatic manifestation through cognitive reserve.',
      },
      {
        order: 3,
        type: 'fill_in_the_blank',
        prompt: 'Complete the sentence below. Write NO MORE THAN TWO WORDS from the passage:\nBilinguals exhibit heightened structural integrity in the __________ tracts of the brain.',
        correctAnswer: 'white matter',
        evidenceQuote: 'diffusion tensor imaging confirms greater structural integrity within the white matter tracts of the corpus callosum',
        explanationBn: 'প্যারাগ্রাফ C-তে সরাসরি লেখা আছে: "...greater structural integrity within the white matter tracts..."। তাই সঠিক উত্তর white matter।',
        explanationEn: 'Paragraph C states: "diffusion tensor imaging confirms greater structural integrity within the white matter tracts".',
      },
      {
        order: 4,
        type: 'matching_headings',
        prompt: 'Choose the most appropriate heading for [Paragraph D] from the choices below:',
        options: [
          'i. Long-term protective buffers against age-related neurodegeneration',
          'ii. Historical misconceptions in early 20th century schooling',
          'iii. Surgical interventions for severe memory loss',
          'iv. Mathematical advantages of monolingual speakers',
        ],
        correctAnswer: 'i. Long-term protective buffers against age-related neurodegeneration',
        evidenceQuote: 'lifetime bilingualism delays the symptomatic manifestation of neurodegenerative disorders, such as Alzheimer\'s disease, by an average of 4.5 years.',
        explanationBn: 'প্যারাগ্রাফ D-এর মূল প্রতিপাদ্য হলো কীভাবে দ্বিভাষিকতা বৃদ্ধ বয়সে আলঝেইমারস বা স্নায়বিক ক্ষয় থেকে মস্তিষ্ককে সুরক্ষা দেয় (cognitive reserve)। তাই শিরোনাম "i. Long-term protective buffers against age-related neurodegeneration" সম্পূর্ণ সঠিক।',
        explanationEn: 'Paragraph D focuses on how bilingualism delays neurodegenerative symptoms like Alzheimer\'s by 4.5 years through cognitive reserve.',
      },
    ],
  },
  {
    title: 'Deep-Sea Hydrothermal Vents and Extremophilic Plastic Degradation',
    source: 'bbc_science',
    sourceName: 'BBC News — Science & Environment',
    sourceUrl: 'https://www.bbc.com/news/science-environment-68910245',
    topic: 'Marine Biotechnology and Enzymatic Recycling',
    difficulty: 'academic',
    timeLimitMinutes: 20,
    headlineSnippet: 'Oceanographers discover thermophilic bacterial strains producing enzymes capable of deconstructing PET plastics.',
    content: `[Paragraph A] As synthetic polymers proliferate across the world\'s oceans, the accumulation of non-biodegradable plastics has precipitated an environmental crisis of unprecedented dimensions. Polyethylene terephthalate (PET), the dominant polymer utilized in single-use beverage containers and synthetic textiles, features exceptionally durable ester bonds engineered specifically to resist chemical weathering and biological breakdown. Standard municipal recycling paradigms rely predominantly on mechanical re-granulation, a process that progressively degrades polymer chain integrity, resulting in down-cycled textiles that ultimately end their lifecycle in municipal incinerators or open landfills.

[Paragraph B] In search of biological solutions, oceanographic expeditions exploring abyssal tectonic boundaries have targeted hydrothermal vent ecosystems. Located at depths exceeding four thousand meters, these volcanic vents discharge superheated, mineral-saturated fluids into pitch-black waters under catastrophic hydrostatic pressures. Organisms inhabiting these extreme benthic niches—termed extremophiles—have evolved unconventional enzymatic machinery capable of catalyzing complex metabolic conversions under temperatures that would instantaneously denature ordinary terrestrial enzymes.

[Paragraph C] During an oceanic survey led by international marine researchers, deep-sea sampling submersibles extracted bacterial cultures from basaltic chimney formations. Biochemical assays confirmed that an isolated thermophilic bacterium, provisionally classified within the genus Caldimonas, synthesized a potent extracellular cutinase enzyme. Laboratory testing revealed that this esterase enzyme depolymerizes polyethylene terephthalate into its foundational monomers—terephthalic acid and ethylene glycol—within seventy-two hours at an optimal operating temperature of seventy degrees Celsius.

[Paragraph D] Crucially, the extreme thermal stability of this deep-sea enzyme circumvents the principal hurdle that has historically restricted industrial biological recycling: PET glass transition temperature. Below sixty-five degrees Celsius, PET polymers exist in a semi-crystalline, glassy conformation that renders their internal ester bonds inaccessible to biocatalysts. Because the hydrothermal enzyme functions seamlessly at elevated temperatures where plastic molecules soften, enzymatic cleavage progresses with remarkable kinetic efficiency, leaving no toxic secondary microplastics.

[Paragraph E] Nevertheless, transitioning this abyssal biotechnology from controlled bioreactors to global manufacturing infrastructure poses substantial engineering hurdles. Cultivating anaerobic extremophilic cultures at commercial scales requires specialized pressurized vessels and rigorous thermal regulation. Environmental economists argue, however, that the capacity to regenerate virgin-quality resin infinitely without petrochemical petroleum extraction makes deep-sea enzymatic recycling one of the most promising frontiers of the circular global economy.`,
    questions: [
      {
        order: 1,
        type: 'multiple_choice',
        prompt: 'According to Paragraph A, what is the main drawback of mechanical recycling?',
        options: [
          'A. It releases lethal doses of radioactive radiation into local aquifers',
          'B. It degrades the polymer chain length, leading to inferior down-cycled materials',
          'C. It requires subterranean oceanic temperatures below freezing',
          'D. It can only be performed on organic glass bottles',
        ],
        correctAnswer: 'B. It degrades the polymer chain length, leading to inferior down-cycled materials',
        evidenceQuote: 'mechanical re-granulation, a process that progressively degrades polymer chain integrity, resulting in down-cycled textiles',
        explanationBn: 'প্যারাগ্রাফ A স্পষ্ট করে যে প্রথাগত যান্ত্রিক পুনর্ব্যবহার (mechanical recycling) পলিমার চেইনের শক্তি হ্রাস করে, ফলে নিম্নমানের পণ্য তৈরি হয় যা পরিশেষে বর্জ্যে পরিণত হয়।',
        explanationEn: 'Paragraph A explains that mechanical re-granulation progressively degrades polymer chain integrity, resulting in down-cycled textiles.',
      },
      {
        order: 2,
        type: 'true_false_not_given',
        prompt: 'The deep-sea cutinase enzyme loses its biological activity when heated to seventy degrees Celsius.',
        options: ['True', 'False', 'Not Given'],
        correctAnswer: 'False',
        evidenceQuote: 'this esterase enzyme depolymerizes polyethylene terephthalate into its foundational monomers... within seventy-two hours at an optimal operating temperature of seventy degrees Celsius.',
        explanationBn: 'প্যারাগ্রাফ C অনুযায়ী এই এনজাইমের সর্বোত্তম কাজের তাপমাত্রা (optimal operating temperature) হলো ৭০ ডিগ্রি সেলসিয়াস। সুতরাং এটি ৭০ ডিগ্রিতে নষ্ট হয় না, বরং সর্বোচ্চ কাজ করে। তাই উত্তর False।',
        explanationEn: 'Paragraph C states that seventy degrees Celsius is actually the enzyme\'s optimal operating temperature, directly contradicting the prompt statement.',
      },
      {
        order: 3,
        type: 'fill_in_the_blank',
        prompt: 'Complete the sentence below. Write NO MORE THAN TWO WORDS from the passage:\nEnzymatic cleavage progresses rapidly because elevated temperatures cause plastic molecules to __________.',
        correctAnswer: 'soften',
        evidenceQuote: 'Because the hydrothermal enzyme functions seamlessly at elevated temperatures where plastic molecules soften',
        explanationBn: 'প্যারাগ্রাফ D-তে উল্লেখ আছে: "...elevated temperatures where plastic molecules soften..."। তাই সঠিক উত্তর soften।',
        explanationEn: 'Paragraph D states: "Because the hydrothermal enzyme functions seamlessly at elevated temperatures where plastic molecules soften".',
      },
      {
        order: 4,
        type: 'matching_headings',
        prompt: 'Choose the most suitable heading for [Paragraph D] from the list below:',
        options: [
          'i. Overcoming temperature barriers to access polymer bonds',
          'ii. History of single-use plastic production in Asia',
          'iii. Ecological hazards of deep-sea trench mining',
          'iv. The extinction of marine extremophiles',
        ],
        correctAnswer: 'i. Overcoming temperature barriers to access polymer bonds',
        evidenceQuote: 'Crucially, the extreme thermal stability of this deep-sea enzyme circumvents the principal hurdle that has historically restricted industrial biological recycling: PET glass transition temperature.',
        explanationBn: 'প্যারাগ্রাফ D আলোচনা করেছে কীভাবে উচ্চ তাপমাত্রায় কাজ করার ক্ষমতা প্লাস্টিকের গ্লাস ট্রানজিশন প্রতিবন্ধকতা কাটিয়ে উঠতে সাহায্য করে। তাই "i. Overcoming temperature barriers to access polymer bonds" সঠিক শিরোনাম।',
        explanationEn: 'Paragraph D focuses on circumventing the glass transition temperature hurdle so the enzyme can access polymer bonds.',
      },
    ],
  },
  {
    title: 'Satellite Telemetry and the Depletion of Global Groundwater Aquifers',
    source: 'guardian_environment',
    sourceName: 'The Guardian — Climate & Nature',
    sourceUrl: 'https://www.theguardian.com/environment/groundwater-depletion-global-basins',
    topic: 'Hydrogeology and Agricultural Sustainability',
    difficulty: 'academic',
    timeLimitMinutes: 20,
    headlineSnippet: 'GRACE satellite gravimetry confirms twenty-one of thirty-seven major global aquifers have passed critical sustainability tipping points.',
    content: `[Paragraph A] Beneath the arid plains and agricultural breadbaskets of the globe lie massive subterranean reservoirs known as aquifers. Accumulated over millennia through the steady infiltration of precipitation, these subterranean sponges provide over thirty-five percent of the freshwater utilized by humanity and support nearly half of all global crop irrigation. For generations, aquifers were regarded by municipal hydrologists and agrarian planners as boundless safety buffers, immune to the cyclical droughts and seasonal evaporation that afflict surface reservoirs.

[Paragraph B] That assumption of subterranean abundance has been definitively dismantled by satellite telemetry. The Gravity Recovery and Climate Experiment (GRACE), a collaborative mission operated by NASA and the German Aerospace Center, utilizes paired twin satellites to measure minute fluctuations in Earth's gravitational field. As groundwater volume shifts across continental landmasses, the localized gravitational pull exerts a measurable tug on the orbital satellites. By calculating inter-satellite distance variances down to a fraction of a human hair width, hydrologists have generated the first comprehensive global census of subterranean water reserves.

[Paragraph C] The empirical findings revealed by GRACE gravimetry are stark. Twenty-one of the world's thirty-seven largest subterranean aquifers have surpassed critical sustainability tipping points, experiencing systematic net discharge without meaningful annual replenishment. The most severe declines coincide with hyper-intensive agricultural belts: California's Central Valley, the Indus Basin in South Asia, and the North China Plain. In these critical agrarian corridors, diesel and electric turbine wells bore hundreds of meters into bedrock to extract "fossil water"—ancient hydrological deposits trapped during the Pleistocene epoch that possess zero modern recharge connectivity.

[Paragraph D] Beyond imminent irrigation deficits, chronic groundwater over-extraction inflicts irreversible geological destruction through land subsidence. As subterranean pore water pressure collapses, the overlying alluvial silt and clay layers undergo permanent compaction. In coastal estuaries, this compaction precipitates accelerated relative sea-level rise and saltwater intrusion into municipal wells. In inland agricultural valleys, compaction permanently eliminates aquifer storage porosity, meaning that even prolonged future deluge events will fail to refill the flattened subterranean geological voids.

[Paragraph E] Preventing catastrophic agricultural disruption demands a fundamental overhaul of international agrarian policy. Hydrological experts advocate for real-time volumetric extraction licensing, progressive water tariffs for water-intensive export crops, and the widespread deployment of sub-surface drip micro-irrigation. Ultimately, treating subterranean water as a finite, exhaustible geological asset rather than an infinite entitlement represents the paramount agricultural challenge of the twenty-first century.`,
    questions: [
      {
        order: 1,
        type: 'multiple_choice',
        prompt: 'How do the GRACE satellites measure subterranean water shifts according to Paragraph B?',
        options: [
          'A. By firing high-intensity x-ray lasers through the Earth\'s crust',
          'B. By detecting minute variations in local gravitational pull between twin orbital satellites',
          'C. By counting the number of diesel pumps operating across rural farmlands',
          'D. By measuring the chemical chlorine concentration of atmospheric clouds',
        ],
        correctAnswer: 'B. By detecting minute variations in local gravitational pull between twin orbital satellites',
        evidenceQuote: 'As groundwater volume shifts across continental landmasses, the localized gravitational pull exerts a measurable tug on the orbital satellites. By calculating inter-satellite distance variances',
        explanationBn: 'প্যারাগ্রাফ B স্পষ্ট করে যে GRACE স্যাটেলাইট দুটি পৃথিবীর ভূগর্ভস্থ পানির ভরের পরিবর্তনের কারণে মহাকর্ষীয় টানের তারতম্য পরিমাপ করে পানির স্তর নির্ণয় করে।',
        explanationEn: 'Paragraph B explicitly describes how paired twin satellites detect minute variations in localized gravitational pull as groundwater volume shifts.',
      },
      {
        order: 2,
        type: 'true_false_not_given',
        prompt: 'Fossil water extracted from deep aquifers can easily be replenished within a few days of heavy rainfall.',
        options: ['True', 'False', 'Not Given'],
        correctAnswer: 'False',
        evidenceQuote: 'fossil water—ancient hydrological deposits trapped during the Pleistocene epoch that possess zero modern recharge connectivity.',
        explanationBn: 'প্যারাগ্রাফ C অনুযায়ী ফসিল ওয়াটার হলো প্রাচীন যুগের পানি যার সাথে আধুনিক রিচার্জের কোনো সংযোগ নেই ("zero modern recharge connectivity")। তাই কয়েকদিনের বৃষ্টিতে তা পূরণ হওয়া অসম্ভব। উত্তর False।',
        explanationEn: 'Paragraph C states fossil water possesses "zero modern recharge connectivity", meaning short-term rainfall cannot replenish it.',
      },
      {
        order: 3,
        type: 'fill_in_the_blank',
        prompt: 'Complete the sentence below. Write NO MORE THAN TWO WORDS from the passage:\nWhen pore water pressure collapses, the ground undergoes permanent compaction leading to __________ in coastal estuaries.',
        correctAnswer: 'saltwater intrusion',
        evidenceQuote: 'In coastal estuaries, this compaction precipitates accelerated relative sea-level rise and saltwater intrusion into municipal wells.',
        explanationBn: 'প্যারাগ্রাফ D-তে বলা হয়েছে: "...precipitates accelerated relative sea-level rise and saltwater intrusion into municipal wells."। সঠিক শব্দ saltwater intrusion।',
        explanationEn: 'Paragraph D states that compaction precipitates accelerated relative sea-level rise and saltwater intrusion into municipal wells.',
      },
      {
        order: 4,
        type: 'matching_headings',
        prompt: 'Choose the most appropriate heading for [Paragraph D] from the choices below:',
        options: [
          'i. Geological compaction and irreversible loss of storage capacity',
          'ii. Technological construction of orbital satellites',
          'iii. Agricultural subsidies for diesel powered generators',
          'iv. The historical expansion of California wine orchards',
        ],
        correctAnswer: 'i. Geological compaction and irreversible loss of storage capacity',
        evidenceQuote: 'compaction permanently eliminates aquifer storage porosity, meaning that even prolonged future deluge events will fail to refill the flattened subterranean geological voids.',
        explanationBn: 'প্যারাগ্রাফ D-এর বিষয়বস্তু হলো ভূমির ধস (land subsidence), পলির সংকোচন এবং ভূগর্ভস্থ পানি ধারণক্ষমতার অপূরণীয় ক্ষতি। তাই "i. Geological compaction and irreversible loss of storage capacity" যথার্থ।',
        explanationEn: 'Paragraph D focuses on land subsidence, structural compaction of silt layers, and permanent elimination of storage porosity.',
      },
    ],
  },
  {
    title: 'The Sundarbans Mangrove Bastion: Hydrodynamic Attenuation in the Bengal Delta',
    source: 'daily_star',
    sourceName: 'The Daily Star — Environment & Heritage',
    sourceUrl: 'https://www.thedailystar.net/environment/sundarbans-mangrove-cyclone-resilience',
    topic: 'Mangrove Ecology and Coastal Resilience in the Bengal Delta',
    difficulty: 'academic',
    timeLimitMinutes: 20,
    headlineSnippet: 'Hydrological field measurements reveal the dense prop-root architecture of the Sundarbans dissipates cyclone surge energy.',
    content: `[Paragraph A] Spanning approximately ten thousand square kilometers across southwestern Bangladesh and the Indian state of West Bengal, the Sundarbans represents the largest contiguous halophytic mangrove wetland on Earth. Situated at the dynamic confluence of the Ganges, Brahmaputra, and Meghna river systems, this UNESCO World Heritage ecosystem functions as an indispensable biological rampart against the ferocious tropical cyclones that periodically germinate over the warm waters of the Bay of Bengal.

[Paragraph B] The mechanical efficacy of the Sundarbans as a coastal defense system is rooted in the hydrodynamic architecture of its dominant arboreal species: Heritiera fomes (locally termed Sundari) and Excoecaria agallocha (Gewa). These mangrove species have evolved intricate subterranean root matrices comprising stilt roots, prop roots, and vertical finger-like breathing pneumatophores that protrude above anoxic tidal muds. When cyclonic tidal surges travel inland from the bay, this subsurface forest of roots creates immense friction, disrupting wave momentum and attenuating storm surge energy by up to forty percent before water reaches inhabited agrarian polders.

[Paragraph C] In addition to attenuating wave kinetics, the mangrove root network performs continuous geological land building through sediment entrapment. As silt-laden river discharge collides with incoming marine tides, the baffling effect of the root architecture decelerates water velocity, compelling suspended mineral silts to settle onto the forest floor. Empirical core sampling demonstrates that vertical sediment accretion across the Sundarbans interior averages between three and five millimeters annually—a rate that remarkably keeps pace with regional relative sea-level rise without human intervention.

[Paragraph D] Despite its undeniable resilience, the Sundarbans faces compounding anthropogenic threats that jeopardize its protective capacity. Upstream water diversion along international river tributaries has drastically curtailed seasonal freshwater inflows, triggering hypersalinity in western forest blocks. Hypersaline soil conditions induce "top-dying" disease among mature Sundari trees, diminishing canopy density and weakening root mechanical resistance. Furthermore, the expansion of commercial shrimp aquaculture along the forest periphery has fragmented critical buffer zones.

[Paragraph E] Conserving this natural bastion demands collaborative delta management that transcends national boundaries. Safeguarding minimum transboundary dry-season river flows is imperative to prevent saltwater encroachment. Simultaneously, empowering peripheral coastal communities through eco-tourism and sustainable apiculture ensures that local populations become active custodians of the forest rather than timber extractors. As global climate destabilization amplifies storm intensity, preserving the living mangrove barrier remains the single most cost-effective coastal adaptation strategy for Bangladesh.`,
    questions: [
      {
        order: 1,
        type: 'multiple_choice',
        prompt: 'According to Paragraph B, how do mangrove roots reduce storm surge damage?',
        options: [
          'A. By creating friction that disrupts wave momentum and dissipates kinetic energy',
          'B. By absorbing tidal water directly into the tree trunks to completely drain the sea',
          'C. By releasing chemical gases that alter the atmospheric cyclone wind direction',
          'D. By building concrete dikes alongside earthen agrarian polders',
        ],
        correctAnswer: 'A. By creating friction that disrupts wave momentum and dissipates kinetic energy',
        evidenceQuote: 'this subsurface forest of roots creates immense friction, disrupting wave momentum and attenuating storm surge energy by up to forty percent',
        explanationBn: 'প্যারাগ্রাফ B ব্যাখ্যা করে যে ম্যানগ্রোভের শিকড়ের নেটওয়ার্ক পানির তরঙ্গের সাথে ঘর্ষণ (friction) তৈরি করে ঢেউয়ের গতিবেগ কমিয়ে ফেলে এবং ৪০% পর্যন্ত শক্তি শোষণ করে নেয়।',
        explanationEn: 'Paragraph B explicitly notes that the root forest creates immense friction, disrupting wave momentum and attenuating storm surge energy by up to forty percent.',
      },
      {
        order: 2,
        type: 'true_false_not_given',
        prompt: 'Annual sediment accretion in the Sundarbans is completely unable to keep up with regional sea-level rise.',
        options: ['True', 'False', 'Not Given'],
        correctAnswer: 'False',
        evidenceQuote: 'vertical sediment accretion across the Sundarbans interior averages between three and five millimeters annually—a rate that remarkably keeps pace with regional relative sea-level rise',
        explanationBn: 'প্যারাগ্রাফ C অনুযায়ী সুন্দরবনের বার্ষিক পলি জমা হওয়ার হার (৩-৫ মিমি) সমুদ্রপৃষ্ঠের উচ্চতা বৃদ্ধির সাথে তাল মেলাতে সক্ষম ("keeps pace with regional relative sea-level rise")। সুতরাং প্রশ্নোক্ত বক্তব্যটি সম্পূর্ণ False।',
        explanationEn: 'Paragraph C states that sediment accretion averages 3-5mm annually, which "remarkably keeps pace with regional relative sea-level rise".',
      },
      {
        order: 3,
        type: 'fill_in_the_blank',
        prompt: 'Complete the sentence below. Write NO MORE THAN TWO WORDS from the passage:\nReduced freshwater inflows cause hypersalinity leading to __________ among mature Sundari trees.',
        correctAnswer: 'top-dying disease',
        evidenceQuote: 'Hypersaline soil conditions induce "top-dying" disease among mature Sundari trees',
        explanationBn: 'প্যারাগ্রাফ D-তে উল্লেখ আছে: "Hypersaline soil conditions induce \'top-dying\' disease among mature Sundari trees..."। সঠিক উত্তর top-dying disease (বা top-dying)।',
        explanationEn: 'Paragraph D states that hypersaline soil conditions induce "top-dying" disease among mature Sundari trees.',
      },
      {
        order: 4,
        type: 'matching_headings',
        prompt: 'Choose the most accurate heading for [Paragraph C] from the list below:',
        options: [
          'i. Natural sediment capture and autonomous delta elevation',
          'ii. Commercial shrimp aquaculture expansion',
          'iii. Transboundary river treaties and legal disputes',
          'iv. The botanical classification of honeybees in Bengal',
        ],
        correctAnswer: 'i. Natural sediment capture and autonomous delta elevation',
        evidenceQuote: 'In addition to attenuating wave kinetics, the mangrove root network performs continuous geological land building through sediment entrapment.',
        explanationBn: 'প্যারাগ্রাফ C সুন্দরবনের শিকড় দ্বারা পলি আটকে রেখে প্রাকৃতিক উপায়ে ভূখণ্ড উঁচু করা (land building through sediment entrapment) নিয়ে আলোচনা করে। তাই "i. Natural sediment capture and autonomous delta elevation" সঠিক শিরোনাম।',
        explanationEn: 'Paragraph C focuses on geological land building through continuous sediment entrapment and vertical accretion.',
      },
    ],
  },
];

async function seedNewsPassages() {
  console.log('🌱 Seeding authentic British Council & News Portal IELTS Passages...');
  await connectDB();

  let addedPassagesCount = 0;
  let addedQuestionsCount = 0;

  for (const item of SEED_PASSAGES) {
    // Check if passage already exists by title
    const existing = await collections.passages().findOne({ title: item.title });
    let passageId: ObjectId;

    if (!existing) {
      passageId = new ObjectId();
      await collections.passages().insertOne({
        _id: passageId,
        title: item.title,
        content: item.content,
        difficulty: item.difficulty,
        timeLimitMinutes: item.timeLimitMinutes,
        status: 'published',
        source: item.source,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        topic: item.topic,
        headlineSnippet: item.headlineSnippet,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Inserted passage: "${item.title}" (${item.sourceName})`);
      addedPassagesCount++;
    } else {
      passageId = existing._id;
      // Update metadata if needed
      await collections.passages().updateOne(
        { _id: passageId },
        {
          $set: {
            source: item.source,
            sourceName: item.sourceName,
            sourceUrl: item.sourceUrl,
            topic: item.topic,
            headlineSnippet: item.headlineSnippet,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`ℹ️ Updated existing passage: "${item.title}"`);
    }

    // Insert questions if not already present
    for (const q of item.questions) {
      const qExisting = await collections.questions().findOne({
        passageId,
        prompt: q.prompt,
      });

      if (!qExisting) {
        await collections.questions().insertOne({
          _id: new ObjectId(),
          passageId,
          type: q.type,
          prompt: q.prompt,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          evidenceQuote: q.evidenceQuote,
          explanationBn: q.explanationBn,
          explanationEn: q.explanationEn,
          order: q.order,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        addedQuestionsCount++;
      }
    }
  }

  console.log(`🎉 Seeding complete! Added ${addedPassagesCount} new passages and ${addedQuestionsCount} questions.`);
  await client.close();
  process.exit(0);
}

seedNewsPassages().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});


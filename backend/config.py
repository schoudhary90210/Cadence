"""
Cadence — all tunable constants and feature flags.
Import from this module; never hardcode magic numbers in pipeline code.
"""

import os

# ---------------------------------------------------------------------------
# Pipeline mode
# ---------------------------------------------------------------------------
ANALYSIS_MODE = os.getenv("ANALYSIS_MODE", "HYBRID_ML")  # "RULES_ONLY" | "HYBRID_ML"

# ---------------------------------------------------------------------------
# Audio
# ---------------------------------------------------------------------------
SAMPLE_RATE = 16000
MAX_AUDIO_DURATION_SEC = 300        # 5-minute hard cap
MAX_UPLOAD_SIZE_MB = 50

# ---------------------------------------------------------------------------
# VAD (Voice Activity Detection)
# All durations in milliseconds to match segment schema
# ---------------------------------------------------------------------------
VAD_FRAME_MS = 25                   # RMS frame length
VAD_HOP_MS = 10                     # frame hop
VAD_ENERGY_THRESHOLD_MULTIPLIER = 0.3  # fraction of mean RMS to call silence
SILENCE_MERGE_GAP_MS = 100          # merge silence regions closer than this
BLOCK_SILENCE_THRESHOLD_MS = 600    # silence >= this inside utterance = block event.
                                    # Lowered from 750 to 600 to catch mid-severity blocks.
                                    # Natural prosody pauses (commas, breath groups) are
                                    # typically 300–500 ms. Sentence-boundary filter (Filter B)
                                    # prevents inter-sentence pauses from triggering.

# ---------------------------------------------------------------------------
# Repetition detection
# ---------------------------------------------------------------------------
LEVENSHTEIN_THRESHOLD = 0.85        # similarity ratio to flag as repetition
REPETITION_WINDOW_SIZES = [1, 2, 3] # word n-gram windows to check

# ---------------------------------------------------------------------------
# Filler / interjection detection
# ---------------------------------------------------------------------------
FILLER_WORDS = [
    "um", "uh", "erm", "er", "eh", "ah", "hm", "hmm", "mm",
    "huh", "like", "you know", "i mean",
]

# ---------------------------------------------------------------------------
# Speaking rate
# ---------------------------------------------------------------------------
NORMAL_RATE_MIN = 3.5   # syllables/sec
NORMAL_RATE_MAX = 5.5
PACE_WINDOW_SEC = 3.0   # rolling window for pace variability

# ---------------------------------------------------------------------------
# Composite fluency score weights (penalty points per event)
# ---------------------------------------------------------------------------
SCORE_WEIGHTS = {
    "blocks": 15,
    "prolongations": 12,
    "sound_repetitions": 10,
    "word_repetitions": 8,
    "fillers": 5,
    "pace_variance": 10,
}

# ---------------------------------------------------------------------------
# Severity bands (score → label)
# ---------------------------------------------------------------------------
SEVERITY_BANDS = {
    "mild":             (80, 100),
    "moderate":         (60, 80),
    "moderate-severe":  (40, 60),
    "severe":           (0,  40),
}

# ---------------------------------------------------------------------------
# ML model paths (Tier 2 — only used in HYBRID_ML mode)
# ---------------------------------------------------------------------------
WAV2VEC_MODEL_ID = "facebook/wav2vec2-base"
WAV2VEC_ASR_MODEL_ID = "facebook/wav2vec2-base-960h"
WAV2VEC_CLASSIFIER_PATH = os.getenv(
    "WAV2VEC_CLASSIFIER_PATH", "ml_cache/classifier.pkl"
)
WAV2VEC_EMBEDDINGS_PATH = os.getenv(
    "WAV2VEC_EMBEDDINGS_PATH", "ml_cache/sep28k_embeddings.npy"
)

# ---------------------------------------------------------------------------
# Whisper
# ---------------------------------------------------------------------------
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base.en")

# ---------------------------------------------------------------------------
# Demo samples
# ---------------------------------------------------------------------------
DEMO_SAMPLES_DIR = "demo_samples"
DEMO_CACHED_RESULTS_DIR = "demo_samples/cached_results"

# ---------------------------------------------------------------------------
# Audio file storage
# ---------------------------------------------------------------------------
AUDIO_UPLOADS_DIR = os.getenv("AUDIO_UPLOADS_DIR", "audio_uploads")

# ---------------------------------------------------------------------------
# Google Cloud Platform integration (all optional — graceful degradation)
# ---------------------------------------------------------------------------
CLOUD_STT_ENABLED = os.getenv("CLOUD_STT_ENABLED", "true").lower() == "true"
GCS_ENABLED = os.getenv("GCS_ENABLED", "true").lower() == "true"
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "cadence-audio-cadence-cheeshacks")
FIRESTORE_ENABLED = os.getenv("FIRESTORE_ENABLED", "true").lower() == "true"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# ---------------------------------------------------------------------------
# Practice mode — reading passages and conversation prompts
# ---------------------------------------------------------------------------

READING_PASSAGES = [
    # ── Easy (short, simple everyday words) ──────────────────────────────
    {
        "id": "easy_1",
        "title": "The Fox",
        "difficulty": "easy",
        "text": (
            "The quick brown fox jumps over the lazy dog. "
            "This sentence contains every letter of the alphabet "
            "and is commonly used for typing practice."
        ),
    },
    {
        "id": "easy_2",
        "title": "Weather",
        "difficulty": "easy",
        "text": (
            "Today is a beautiful sunny day. "
            "The sky is clear and blue with a few white clouds floating by."
        ),
    },
    {
        "id": "easy_3",
        "title": "Morning Routine",
        "difficulty": "easy",
        "text": (
            "I wake up early every morning and make a cup of coffee. "
            "Then I take my dog for a short walk around the block before breakfast."
        ),
    },
    {
        "id": "easy_4",
        "title": "The Park",
        "difficulty": "easy",
        "text": (
            "The children played in the park after school. "
            "They ran around the swings and climbed the slide until it was time to go home."
        ),
    },
    {
        "id": "easy_5",
        "title": "My Cat",
        "difficulty": "easy",
        "text": (
            "My cat likes to sit by the window and watch the birds outside. "
            "She purrs softly when I scratch behind her ears."
        ),
    },
    {
        "id": "easy_6",
        "title": "The Store",
        "difficulty": "easy",
        "text": (
            "I went to the store to buy some milk and bread. "
            "The cashier smiled and wished me a good day as I left."
        ),
    },
    {
        "id": "easy_7",
        "title": "Bedtime",
        "difficulty": "easy",
        "text": (
            "Every night I read a book before going to sleep. "
            "It helps me relax and I usually fall asleep within ten minutes."
        ),
    },
    {
        "id": "easy_8",
        "title": "The Garden",
        "difficulty": "easy",
        "text": (
            "My grandmother has a small garden in her backyard. "
            "She grows tomatoes, peppers, and fresh herbs that she uses for cooking."
        ),
    },
    # ── Medium (moderate length, everyday topics, some detail) ────────────
    {
        "id": "med_1",
        "title": "Technology",
        "difficulty": "medium",
        "text": (
            "Artificial intelligence has transformed how we interact with technology. "
            "From voice assistants to recommendation systems, machine learning algorithms "
            "process vast amounts of data to provide personalized experiences "
            "for millions of users worldwide."
        ),
    },
    {
        "id": "med_2",
        "title": "Ocean Ecosystems",
        "difficulty": "medium",
        "text": (
            "Coral reefs support approximately twenty-five percent of all marine species "
            "despite covering less than one percent of the ocean floor. These underwater "
            "structures are built over thousands of years by tiny organisms called coral polyps, "
            "which form symbiotic relationships with photosynthetic algae."
        ),
    },
    {
        "id": "med_3",
        "title": "Urban Design",
        "difficulty": "medium",
        "text": (
            "Modern city planners are increasingly incorporating green spaces into urban design. "
            "Parks, community gardens, and tree-lined boulevards not only improve air quality "
            "but also promote mental well-being and create gathering spaces "
            "that strengthen neighborhood connections."
        ),
    },
    {
        "id": "med_4",
        "title": "Photography",
        "difficulty": "medium",
        "text": (
            "Photography has evolved dramatically since the invention of the daguerreotype "
            "in the early nineteenth century. Today, smartphones equipped with advanced sensors "
            "allow virtually anyone to capture high-quality images, blurring the line "
            "between amateur snapshots and professional photography."
        ),
    },
    {
        "id": "med_5",
        "title": "Cooking Traditions",
        "difficulty": "medium",
        "text": (
            "Every culture has its own approach to preparing and sharing food. "
            "In many Mediterranean households, meals are slow-cooked with olive oil and fresh herbs, "
            "while East Asian cuisines emphasize balance between sweet, sour, salty, and umami flavors "
            "across multiple small dishes served together."
        ),
    },
    {
        "id": "med_6",
        "title": "Space Exploration",
        "difficulty": "medium",
        "text": (
            "Since the first moon landing in nineteen sixty-nine, humanity has sent robotic explorers "
            "to every planet in our solar system. Current missions focus on Mars, where rovers "
            "analyze soil samples and search for signs of ancient microbial life "
            "beneath the dusty red surface."
        ),
    },
    {
        "id": "med_7",
        "title": "Music and Memory",
        "difficulty": "medium",
        "text": (
            "Researchers have found that music activates multiple regions of the brain simultaneously, "
            "including areas responsible for emotion, memory, and motor control. "
            "This is why a familiar song can instantly transport you back to a specific moment "
            "in your life, complete with vivid sensory details."
        ),
    },
    {
        "id": "med_8",
        "title": "Renewable Energy",
        "difficulty": "medium",
        "text": (
            "Wind and solar power now account for a growing share of global electricity generation. "
            "Advances in battery storage technology are helping to address the intermittent nature "
            "of these sources, making it possible to store surplus energy during peak production "
            "and release it when demand is highest."
        ),
    },
    # ── Hard (longer, complex vocabulary, abstract topics) ────────────────
    {
        "id": "hard_1",
        "title": "Neuroscience",
        "difficulty": "hard",
        "text": (
            "Neuroplasticity demonstrates the brain's remarkable capacity for reorganization "
            "throughout an individual's lifespan. Synaptic connections strengthen through "
            "repeated activation, while underutilized pathways gradually diminish, "
            "illustrating the principle that neurons which fire together wire together. "
            "This phenomenon has profound implications for rehabilitation following "
            "traumatic brain injuries and for understanding how habitual behaviors "
            "become deeply embedded in our neural architecture."
        ),
    },
    {
        "id": "hard_2",
        "title": "Quantum Computing",
        "difficulty": "hard",
        "text": (
            "Quantum computing leverages the principles of superposition and entanglement "
            "to perform calculations that would be intractable for classical processors. "
            "Unlike traditional binary bits, quantum bits or qubits can exist in multiple "
            "states simultaneously, enabling exponential parallelism. Researchers anticipate "
            "breakthroughs in cryptography, pharmaceutical discovery, and optimization "
            "problems that currently require prohibitive computational resources."
        ),
    },
    {
        "id": "hard_3",
        "title": "Philosophical Ethics",
        "difficulty": "hard",
        "text": (
            "The intersection of consequentialism and deontological ethics presents "
            "a perennial philosophical dilemma. Utilitarian frameworks evaluate actions "
            "based on their aggregate outcomes, whereas Kantian ethics emphasizes "
            "categorical imperatives and the inherent dignity of rational agents. "
            "Contemporary ethicists increasingly advocate for pluralistic approaches "
            "that synthesize complementary moral intuitions rather than privileging "
            "any single theoretical paradigm."
        ),
    },
    {
        "id": "hard_4",
        "title": "Linguistic Relativity",
        "difficulty": "hard",
        "text": (
            "The Sapir-Whorf hypothesis posits that the structure of a language fundamentally "
            "influences the cognitive processes and worldview of its speakers. Strong versions "
            "of this theory suggest linguistic determinism, where thought is constrained by "
            "grammatical categories, while weaker formulations propose that language merely "
            "predisposes speakers toward certain perceptual and conceptual distinctions "
            "without rigidly delimiting their cognitive repertoire."
        ),
    },
    {
        "id": "hard_5",
        "title": "The Microbiome",
        "difficulty": "hard",
        "text": (
            "The human gut microbiome comprises trillions of microorganisms that play "
            "indispensable roles in nutrient metabolism, immune system modulation, and even "
            "neurotransmitter synthesis. Disruptions to this delicate microbial ecosystem, "
            "known as dysbiosis, have been implicated in conditions ranging from inflammatory "
            "bowel disease to depression, prompting researchers to investigate targeted "
            "probiotic interventions and fecal microbiota transplantation as therapeutic strategies."
        ),
    },
    {
        "id": "hard_6",
        "title": "Renaissance Art",
        "difficulty": "hard",
        "text": (
            "The Italian Renaissance marked a transformative period in which artists systematically "
            "applied principles of linear perspective, chiaroscuro, and anatomical accuracy "
            "to create works of unprecedented realism. Figures such as Leonardo da Vinci and "
            "Michelangelo synthesized scientific observation with artistic virtuosity, "
            "establishing aesthetic conventions that would dominate Western visual culture "
            "for centuries and continue to influence contemporary artistic practice."
        ),
    },
    {
        "id": "hard_7",
        "title": "Behavioral Economics",
        "difficulty": "hard",
        "text": (
            "Behavioral economics challenges the classical assumption of perfectly rational "
            "decision-making by demonstrating systematic cognitive biases that influence "
            "economic behavior. Prospect theory, developed by Kahneman and Tversky, reveals "
            "that individuals evaluate potential losses and gains asymmetrically, exhibiting "
            "pronounced loss aversion that leads to risk-seeking behavior when facing losses "
            "and risk-averse choices when presented with equivalent gains."
        ),
    },
    {
        "id": "hard_8",
        "title": "Modern Cryptography",
        "difficulty": "hard",
        "text": (
            "Public-key cryptographic systems rely on mathematical problems believed to be "
            "computationally intractable, such as the factorization of large semiprime integers "
            "underlying the RSA algorithm. The emergence of quantum computing threatens these "
            "foundations, as Shor's algorithm could theoretically decompose such numbers "
            "in polynomial time, motivating the development of post-quantum cryptographic "
            "schemes based on lattice problems and error-correcting codes."
        ),
    },
    # ── Ultra Hard (longest, specialized vocabulary, complex syntax) ──────
    {
        "id": "ultra_1",
        "title": "Immunological Cascades",
        "difficulty": "ultra_hard",
        "text": (
            "The complement system constitutes a sophisticated immunological cascade "
            "comprising approximately fifty plasma glycoproteins that orchestrate inflammatory "
            "responses through sequential proteolytic activation. Upon encountering pathogenic "
            "molecular patterns, the classical pathway initiates through antigen-antibody "
            "complexes binding to the C1q recognition molecule, triggering conformational "
            "changes that propagate through C1r and C1s serine proteases. This enzymatic "
            "amplification ultimately generates the membrane attack complex, a cylindrical "
            "transmembrane pore that induces osmotic lysis of targeted cellular membranes."
        ),
    },
    {
        "id": "ultra_2",
        "title": "Astrophysical Phenomena",
        "difficulty": "ultra_hard",
        "text": (
            "Magnetohydrodynamic turbulence in accretion disks surrounding supermassive "
            "black holes generates extraordinarily energetic relativistic jets that propagate "
            "across intergalactic distances. The Blandford-Znajek mechanism postulates that "
            "rotational energy extraction from the ergosphere of a Kerr black hole, mediated "
            "by large-scale poloidal magnetic field configurations, provides the requisite "
            "electromagnetic Poynting flux to accelerate charged particles to ultrarelativistic "
            "velocities. Observational evidence from Very Long Baseline Interferometry has "
            "corroborated theoretical predictions regarding jet morphology and polarimetric signatures."
        ),
    },
    {
        "id": "ultra_3",
        "title": "Epigenetic Regulation",
        "difficulty": "ultra_hard",
        "text": (
            "Transgenerational epigenetic inheritance challenges the conventional "
            "neo-Darwinian paradigm by demonstrating that environmentally induced "
            "modifications to chromatin architecture can persist across multiple generations "
            "without alterations to the underlying nucleotide sequence. Mechanisms including "
            "DNA methylation at cytosine-phosphate-guanine dinucleotides, post-translational "
            "histone modifications such as acetylation and trimethylation, and noncoding "
            "ribonucleic acid pathways collectively constitute an epigenomic regulatory "
            "framework that modulates gene expression with remarkable spatiotemporal precision."
        ),
    },
    {
        "id": "ultra_4",
        "title": "Topological Quantum States",
        "difficulty": "ultra_hard",
        "text": (
            "Topological quantum computation exploits non-Abelian anyonic excitations "
            "in two-dimensional electron systems to encode quantum information within "
            "the global topological properties of the system's ground-state manifold. "
            "Unlike conventional qubit architectures susceptible to local decoherence, "
            "topologically protected states exhibit intrinsic fault tolerance because "
            "their quantum numbers depend on the braiding trajectories of quasiparticles "
            "rather than their precise spatial coordinates, rendering the encoded information "
            "immune to perturbative noise below the topological energy gap."
        ),
    },
    {
        "id": "ultra_5",
        "title": "Mitochondrial Dynamics",
        "difficulty": "ultra_hard",
        "text": (
            "Mitochondrial fusion and fission dynamics constitute a sophisticated quality "
            "control mechanism essential for cellular bioenergetics and apoptotic signaling. "
            "Dynamin-related GTPases, including mitofusins one and two and optic atrophy "
            "protein one, mediate outer and inner membrane fusion respectively, while "
            "dynamin-related protein one orchestrates organellar scission through "
            "oligomeric ring constriction. Perturbations in this fission-fusion equilibrium "
            "precipitate mitochondrial fragmentation and bioenergetic collapse, "
            "contributing to neurodegenerative pathologies including Parkinson's and Alzheimer's disease."
        ),
    },
    {
        "id": "ultra_6",
        "title": "Bayesian Epistemology",
        "difficulty": "ultra_hard",
        "text": (
            "Bayesian epistemology formalizes rational belief revision through the iterative "
            "application of conditional probability calculus, whereby prior credences are "
            "updated via likelihood ratios derived from newly acquired evidential propositions. "
            "Critics of strict Bayesianism contend that the problem of logical omniscience "
            "renders idealized probabilistic coherence computationally intractable for "
            "bounded cognitive agents, prompting alternative frameworks such as "
            "Jeffrey conditionalization and imprecise probability theories that accommodate "
            "genuine uncertainty about the appropriate probability measure itself."
        ),
    },
    {
        "id": "ultra_7",
        "title": "Geomorphological Processes",
        "difficulty": "ultra_hard",
        "text": (
            "Periglacial geomorphological processes in permafrost environments generate "
            "distinctive landforms through repeated freeze-thaw cycling and cryogenic "
            "weathering of bedrock substrates. Thermokarst subsidence, resulting from "
            "the degradation of ice-rich permafrost, produces characteristic terrain "
            "irregularities including oriented thaw lakes and retrogressive thaw slumps "
            "that progressively destabilize hillslope geotechnical properties. Contemporary "
            "accelerated permafrost thaw attributable to anthropogenic climate forcing "
            "threatens to mobilize substantial quantities of previously sequestered "
            "organic carbon, potentially establishing a positive feedback mechanism."
        ),
    },
    {
        "id": "ultra_8",
        "title": "Psycholinguistic Processing",
        "difficulty": "ultra_hard",
        "text": (
            "Sentence processing in psycholinguistic theory involves the rapid integration "
            "of lexical, syntactic, and pragmatic information within remarkably constrained "
            "temporal windows. Garden-path phenomena demonstrate that the human parser "
            "initially commits to the most statistically probable syntactic analysis, "
            "necessitating costly reanalysis when subsequent disambiguating information "
            "contradicts the provisionally constructed representation. Event-related "
            "potential studies reveal characteristic electrophysiological signatures "
            "including the N400 for semantic anomalies and the P600 for syntactic "
            "violations, providing neurophysiological evidence for dissociable processing streams."
        ),
    },
    # ── Fixed Progress Test (single passage, 8 sentences getting progressively harder)
    {
        "id": "progress_test",
        "title": "Fixed Progress Test",
        "difficulty": "progress_test",
        "text": (
            "The cat sat on the warm soft mat by the door. "
            "She walked to the nearby store and bought fresh bread, orange juice, and a small bunch of flowers for the kitchen table. "
            "The local community center offers several programs throughout the year, including swimming lessons, art workshops, and volunteer opportunities for teenagers looking to gain practical experience. "
            "Sustainable agriculture practices, such as crop rotation and integrated pest management, have demonstrated significant potential for maintaining soil fertility while simultaneously reducing dependence on synthetic chemical fertilizers. "
            "The philosophical implications of determinism challenge conventional notions of moral responsibility by suggesting that every human decision is the inevitable consequence of preceding causal events, thereby undermining the libertarian conception of free will. "
            "Functional magnetic resonance imaging studies have revealed that bilingual individuals exhibit significantly greater gray matter density in the dorsolateral prefrontal cortex and anterior cingulate cortex, regions critically involved in executive function and cognitive flexibility. "
            "The renormalization group framework in theoretical physics provides a systematic methodology for analyzing how physical systems behave across different length scales by iteratively integrating out short-wavelength fluctuations and rescaling the remaining degrees of freedom. "
            "Chimeric antigen receptor T-cell immunotherapy represents a paradigm-shifting approach to hematological malignancy treatment wherein autologous lymphocytes are genetically engineered ex vivo to express synthetic transmembrane receptors incorporating single-chain variable fragment antigen-recognition domains fused to intracellular costimulatory signaling moieties."
        ),
    },
]

CONVERSATION_PROMPTS = [
    {"id": "casual_1",    "prompt": "How was your day today?",                          "category": "casual"},
    {"id": "casual_2",    "prompt": "What did you have for breakfast this morning?",    "category": "casual"},
    {"id": "casual_3",    "prompt": "Describe your favorite hobby.",                    "category": "casual"},
    {"id": "interview_1", "prompt": "Tell me about yourself and what you do.",          "category": "interview"},
    {"id": "interview_2", "prompt": "What is your greatest strength?",                  "category": "interview"},
    {"id": "story_1",     "prompt": "Tell me about a memorable trip you took.",         "category": "storytelling"},
    {"id": "story_2",     "prompt": "Describe a challenge you overcame recently.",      "category": "storytelling"},
]

# ---------------------------------------------------------------------------
# Prototype disclaimer (injected into every AnalysisResult)
# ---------------------------------------------------------------------------
LIMITATIONS = [
    "Prototype heuristic thresholds — not clinically validated",
    "Noise-sensitive: best results with clean, close-mic audio",
    "English only",
    "Not a medical diagnostic tool",
]

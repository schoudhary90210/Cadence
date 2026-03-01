# Credits & Acknowledgements

## Team

| Name | Role |
|:-----|:-----|
| **Siddhant Choudhary** | Full-Stack Development, ML Pipeline, Cloud Deployment |
| **Christian Cortez** | Backend Development, Signal Processing |
| **Anish Mantri** | Frontend Development, UI/UX Design |
| **Benjamin Lelivelt** | Frontend Development, Accessibility |

Built for **CheeseHacks 2026** — Health & Lifestyle Theme

---

## Backend Dependencies

### Web Framework

| Package | Version | License | Description |
|:--------|:--------|:--------|:------------|
| [FastAPI](https://fastapi.tiangolo.com/) | 0.111.0 | MIT | High-performance async Python web framework |
| [Uvicorn](https://www.uvicorn.org/) | 0.29.0 | BSD-3-Clause | Lightning-fast ASGI server |
| [python-multipart](https://github.com/Kludex/python-multipart) | 0.0.9 | Apache-2.0 | Multipart form data parsing for file uploads |
| [Pydantic](https://docs.pydantic.dev/) | 2.7.1 | MIT | Data validation using Python type annotations |

### Database

| Package | Version | License | Description |
|:--------|:--------|:--------|:------------|
| [SQLAlchemy](https://www.sqlalchemy.org/) | 2.0.30 | MIT | Python SQL toolkit and ORM |

### Audio & Digital Signal Processing

| Package | Version | License | Description |
|:--------|:--------|:--------|:------------|
| [PyTorch](https://pytorch.org/) | >=2.2.0 | BSD-3-Clause | Deep learning framework for Wav2Vec2 inference |
| [torchaudio](https://pytorch.org/audio/) | >=2.2.0 | BSD-2-Clause | Audio processing utilities for PyTorch |
| [Transformers](https://huggingface.co/docs/transformers/) | >=4.40.0 | Apache-2.0 | Hugging Face model hub — Wav2Vec2 weights |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | >=1.0.0 | MIT | CTranslate2-optimized Whisper speech-to-text |
| [librosa](https://librosa.org/) | >=0.10.0 | ISC | Audio analysis — RMS energy, spectral features |
| [SoundFile](https://pysoundfile.readthedocs.io/) | >=0.12.1 | BSD-3-Clause | Audio file I/O via libsndfile |
| [SciPy](https://scipy.org/) | >=1.13.0 | BSD-3-Clause | Scientific computing — signal processing |
| [NumPy](https://numpy.org/) | >=1.26.0 | BSD-3-Clause | Numerical computing foundation |
| [pydub](https://github.com/jiaaro/pydub) | >=0.25.1 | MIT | Audio format conversion (requires ffmpeg) |

### Machine Learning & NLP

| Package | Version | License | Description |
|:--------|:--------|:--------|:------------|
| [scikit-learn](https://scikit-learn.org/) | >=1.4.0 | BSD-3-Clause | Random Forest classifier for disfluency detection |
| [NLTK](https://www.nltk.org/) | >=3.8.1 | Apache-2.0 | CMUDict corpus for syllable counting |
| [python-Levenshtein](https://github.com/rapidfuzz/python-Levenshtein) | >=0.25.0 | GPL-2.0 | Fast edit distance computation for repetition detection |

### Google Cloud Platform (optional)

| Package | Version | License | Description |
|:--------|:--------|:--------|:------------|
| [google-cloud-speech](https://cloud.google.com/speech-to-text) | >=2.21.0 | Apache-2.0 | Cloud Speech-to-Text API client |
| [google-cloud-storage](https://cloud.google.com/storage) | >=2.14.0 | Apache-2.0 | Cloud Storage API client for audio persistence |
| [google-cloud-firestore](https://cloud.google.com/firestore) | >=2.14.0 | Apache-2.0 | Firestore NoSQL database client |

### Utilities

| Package | Version | License | Description |
|:--------|:--------|:--------|:------------|
| [python-dotenv](https://github.com/theskumar/python-dotenv) | 1.0.1 | BSD-3-Clause | Load environment variables from `.env` files |
| [aiofiles](https://github.com/Tinche/aiofiles) | 23.2.1 | Apache-2.0 | Async file I/O for FastAPI |

---

## Frontend Dependencies

### Core Framework

| Package | Version | License | Description |
|:--------|:--------|:--------|:------------|
| [Next.js](https://nextjs.org/) | 14.2.3 | MIT | React framework with App Router, SSR, and static export |
| [React](https://react.dev/) | 18.x | MIT | UI component library |
| [React DOM](https://react.dev/) | 18.x | MIT | React rendering for web browsers |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Apache-2.0 | Typed JavaScript superset |

### UI Components & Styling

| Package | Version | License | Description |
|:--------|:--------|:--------|:------------|
| [Tailwind CSS](https://tailwindcss.com/) | 3.4.1 | MIT | Utility-first CSS framework |
| [Radix UI (Progress)](https://www.radix-ui.com/) | 1.1.8 | MIT | Accessible progress bar primitive |
| [Radix UI (Separator)](https://www.radix-ui.com/) | 1.1.8 | MIT | Accessible separator primitive |
| [Radix UI (Slot)](https://www.radix-ui.com/) | 1.2.4 | MIT | Composable slot primitive |
| [Radix UI (Tabs)](https://www.radix-ui.com/) | 1.1.13 | MIT | Accessible tabs primitive |
| [Framer Motion](https://www.framer.com/motion/) | 11.18.2 | MIT | Production-ready animation library |
| [Lucide React](https://lucide.dev/) | 0.575.0 | ISC | Icon library (fork of Feather Icons) |
| [class-variance-authority](https://cva.style/) | 0.7.1 | Apache-2.0 | CSS class variant management |
| [clsx](https://github.com/lukeed/clsx) | 2.1.1 | MIT | Conditional className utility |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | 2.6.1 | MIT | Merge Tailwind CSS classes without conflicts |

### Data Visualization & Audio

| Package | Version | License | Description |
|:--------|:--------|:--------|:------------|
| [Recharts](https://recharts.org/) | 2.15.4 | MIT | React charting library for score trends and breakdowns |
| [WaveSurfer.js](https://wavesurfer.xyz/) | 7.12.1 | BSD-3-Clause | Audio waveform visualization with region overlays |

### Build Tools

| Package | Version | License | Description |
|:--------|:--------|:--------|:------------|
| [PostCSS](https://postcss.org/) | 8.x | MIT | CSS transformation tool |
| [Autoprefixer](https://github.com/postcss/autoprefixer) | 10.x | MIT | Automatic vendor prefix insertion |

---

## Pre-trained Models

| Model | Source | License | Usage |
|:------|:-------|:--------|:------|
| [wav2vec2-base](https://huggingface.co/facebook/wav2vec2-base) | Meta/Facebook AI | Apache-2.0 | Feature extraction for disfluency classifier |
| [wav2vec2-base-960h](https://huggingface.co/facebook/wav2vec2-base-960h) | Meta/Facebook AI | Apache-2.0 | CTC phonetic transcription for sound repetition detection |
| [faster-whisper base.en](https://huggingface.co/Systran/faster-whisper-base.en) | Systran / OpenAI | MIT | Word-level speech-to-text transcription |

---

## System Dependencies

| Tool | License | Description |
|:-----|:--------|:------------|
| [FFmpeg](https://ffmpeg.org/) | LGPL-2.1+ | Audio/video codec library — required by pydub for format conversion |
| [Python](https://python.org/) | PSF License | Runtime for backend server |
| [Node.js](https://nodejs.org/) | MIT | Runtime for frontend build and server |

---

## Infrastructure

| Service | Provider | Usage |
|:--------|:---------|:------|
| [Cloud Run](https://cloud.google.com/run) | Google Cloud | Backend container hosting |
| [Cloud Speech-to-Text](https://cloud.google.com/speech-to-text) | Google Cloud | Dual transcription alongside Whisper |
| [Cloud Storage](https://cloud.google.com/storage) | Google Cloud | Durable audio file persistence |
| [Firestore](https://cloud.google.com/firestore) | Google Cloud | Cloud-native session and progress storage |
| [Vercel](https://vercel.com/) | Vercel | Frontend static hosting and CDN |

---

## Data & Corpora

| Resource | Source | Usage |
|:---------|:-------|:------|
| [CMUDict](http://www.speech.cs.cmu.edu/cgi-bin/cmudict) | Carnegie Mellon University | Phoneme dictionary for syllable counting |
| [SEP-28k](https://github.com/apple/ml-stuttering-events-dataset) | Apple Machine Learning Research | Reference dataset informing disfluency classifier training |

---

## AI Tools

| Tool | Usage |
|:-----|:------|
| [Claude](https://claude.ai/) (Anthropic) | Assisted with implementation planning |

---

## License

This project was created for CheeseHacks 2026 (hackathon). Individual dependencies retain their respective licenses as listed above.

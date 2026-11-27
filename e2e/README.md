# End-to-end specs

Local/manual only (not in CI). Start the app in demo mode, then run Playwright:

```
DEMO_MODE=1 npx next dev -p 3000          # PowerShell: $env:DEMO_MODE='1'; npx next dev -p 3000
npx playwright test e2e/print.spec.ts e2e/documents.spec.ts e2e/voice-scribe.spec.ts e2e/api-guards.spec.ts
```

Point at another port with `PLAYWRIGHT_BASE_URL=http://localhost:3104` (default is `http://localhost:3000`).

## Print, documents, voice scribe, API guards

| Spec | Covers |
| --- | --- |
| `print.spec.ts` | In print media the report and patient pages hide the sidebar, top bar and bottom tab bar; report buttons are hidden; the report PDF is at most 2 pages. |
| `documents.spec.ts` | Upload on `/documents` is OCR'd (never stuck on "Reading"), extracted Hb/BP values are shown, assigning moves it from Inbox to Processed and onto the patient page; upload from the patient page attaches to that patient. |
| `voice-scribe.spec.ts` | Visit-form voice scribe with Chrome's fake mic (`fixtures/vitals-en.wav`): mocked `/api/voice-vitals` transcript fills the rows and Apply fills the form; a failed transcription ends in a clear error, not a stuck spinner. |
| `api-guards.spec.ts` | Anonymous POSTs to `/api/voice-vitals` and `/api/ocr` are rejected; empty, wrong-type and oversize bodies get a 4xx. |

Env gates and notes:

- `DEMO_MODE=1` is required on the server (signs in through "Demo sign in" and stores data in the local `.matrusetu-demo-store.json`, not Supabase). Each documents run adds demo documents to that store; delete the file to reset.
- `RUN_VOICE_E2E=1` also runs the real-Sarvam voice test (asserts 120/80, 58 kg, Hb 10.5). It spends Sarvam credit; without it the API is mocked.
- `RUN_SCRIBE_E2E=1` enables the existing consultation scribe spec (also paid).
- Document OCR is real: if `SARVAM_API_KEY` is set on the server the upload calls Sarvam, otherwise the browser falls back to Tesseract. If OCR yields no text, the extracted-values assertion is skipped with an annotation.
- `fixtures/lab-report.png` is a typed lab slip (Hb 10.5 g/dL, BP 120/80 mmHg). `fixtures/vitals-en.wav` was generated with Windows SAPI.

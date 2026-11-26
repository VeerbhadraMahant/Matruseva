# MatruSetu: product context

Antenatal-care tool for OB-GYN clinics in India. Staff (doctor, nurse, front desk) use it to run each pregnancy from registration to delivery.

Core workflows:
- **Today**: daily worklist of who is due or overdue for a visit, test or scan, high-risk alerts, upcoming deliveries.
- **Patients**: search and list; register a new pregnancy with the obstetric questionnaire (gravida, para, past history, LMP/EDD); scan a patient QR card.
- **Patient detail**: pregnancy timeline and care schedule, visits with vitals (BP, weight, Hb, FHR) and trend charts, mark care items done, documents, one-page report, close pregnancy.
- **Calls**: follow-up queue for phone and WhatsApp reminders, contact log, WhatsApp bot simulator (demo).
- **Documents**: upload, OCR and assign lab reports to patients.
- **Consult**: consultation scribe (record on phone, transcript, de-identified summary), voice counsellor, mother audio messages via listen links.
- **Settings**: clinic details, staff, risk thresholds, care schedule, message templates, clinical protocol sign-off.

Languages: English, Hindi, Marathi. Demo mode (`DEMO_MODE=1`) seeds a sample clinic. Visual rules: DESIGN.md.

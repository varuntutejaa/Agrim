# Illustrative (synthetic) data only

Anything in this folder is made up for demonstration, never real.

Rules (the competition disqualifies fabricated data presented as real):
- Every file here has an `is_synthetic` column (or field) set to `true`.
- The API passes `is_synthetic` through, and the UI shows an
  **"Illustrative data"** label wherever it is used.
- Nothing in this folder is ever copied into `hotspots.csv`, `incidents.csv`
  or any training set.

Empty for now.

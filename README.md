# Credit Default Risk Model

An interpretable ML credit scoring dashboard for microfinance lending. Delivers feature-level risk factor analysis with regulatory-ready documentation.

## What It Does

- Submits loan application details to the credit risk API and returns a **default probability score**
- Assigns a **credit grade** (A–E) based on the predicted default probability
- Shows **feature-level risk factor breakdown** — which inputs most influenced the decision (SHAP-style explainability)
- Compares the applicant's profile against the model's training population
- Generates a **regulatory-ready risk summary** documenting the key factors behind the decision
- Supports batch scoring for loan portfolio review

## Input Features

| Feature | Description |
|---|---|
| Age | Applicant age |
| Annual Income | Gross annual income |
| Loan Amount | Requested loan principal |
| Credit Score | Bureau credit score (300–850) |
| Months Employed | Tenure at current employer |
| Number of Credit Lines | Active credit facilities |
| Debt-to-Income Ratio | Existing debt obligations / income |
| Loan Purpose | Category of loan use |

## Credit Grade Scale

| Grade | Default Probability | Recommendation |
|---|---|---|
| A | < 5% | Approve |
| B | 5–15% | Approve with conditions |
| C | 15–30% | Refer to underwriter |
| D | 30–50% | Decline / high collateral |
| E | > 50% | Decline |

## Tech Stack

**Frontend**
- Next.js 14 (App Router), TypeScript, Recharts, Tailwind CSS

**Backend API** — [`credit-risk-api`](https://github.com/deeraw1/credit-risk-api)
- Python, FastAPI, XGBoost, joblib
- Deployed on Render

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

Built by [Muhammed Adediran](https://adediran.xyz/contact)

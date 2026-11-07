# ADS Campaign Command Centre

Campaign operations system for **ADS International Auditors LLC**. It sits beside the existing UAE e-invoicing registration website and does not replace it.

The app ships with a **sample** book of 8,000 UAE companies, six specialised agents, daily Excel lead allocation, calling reports, three campaign plans, two webinars, one business breakfast, proposal drafts, and morning / afternoon reporting against a 1,000-conversion target.

This is sample data for operations design. It is not a live client list.

## Agents

| Agent | Role |
| --- | --- |
| Aisha | Duplicate identification (email, mobile, company + emirate) |
| Omar | Daily lead allocation and Excel workbook |
| Layla | Daily calling report and scripts |
| Noor | Three campaign plans with live registration / conversion counts |
| Faris | Proposal generation from company ERP and turnover |
| Hana | Morning briefing and afternoon wrap-up |

## Run locally

```bash
cd campaign
npm install
npm run dev
```

Open [http://127.0.0.1:3100](http://127.0.0.1:3100). The first load seeds the sample database and can take a short time.

```bash
npm run verify
```

checks the 8,000-record seed, duplicate sweep, allocation, and all six agents.

On this machine the signed-in name is a simulated viewer from `cursor/identity.dev.ts`, not a real person.

## Daily motion

1. Run **Aisha**, merge high-confidence duplicates.
2. Run **Omar**, download `ADS-Lead-Allocation-YYYY-MM-DD.xls`.
3. Run **Hana** morning briefing.
4. Call from the allocation sheets; log outcomes on Lead allocation or the customer record.
5. Run **Layla** and **Hana** afternoon wrap-up.
6. Run **Faris** for interested companies.

## Public registration site

The existing static site at the repository root (`index.html`, `dashboard.html`) remains the event registration website. Keep deploying that from the repo root on Vercel as before.

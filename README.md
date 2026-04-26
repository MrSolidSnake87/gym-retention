# Gym Retention Management Platform

A web-based system to identify at-risk gym members and automate personalized retention scripts across the 90-day onboarding journey.

## Features

✅ **File Upload** - Upload member data via CSV or PDF
✅ **At-Risk Detection** - Automatically identify members with no activity (14-30+ days)
✅ **90-Day Onboarding** - Track members through 5 onboarding stages
✅ **Personalized Scripts** - Email and call scripts for each member based on their status
✅ **Dashboard** - Visual breakdown of at-risk members and onboarding cohorts
✅ **Action Queue** - See what needs to be done today for each member

## Getting Started

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Step 1: Upload Member Data

1. Go to the homepage
2. Click "Select File" or drag & drop a CSV/PDF file
3. The system will parse the file and import members

### Step 2: View Dashboard

After upload, the dashboard shows:
- **At-Risk Members**: Sorted by days inactive (longest first)
- **Onboarding by Stage**: Visual breakdown of members in each stage
- **Action Scripts**: Copy-paste ready emails and call scripts

### Step 3: Take Action

Click any member to view their personalized script. Choose between:
- **Email Script**: Ready-to-copy email template
- **Call Script**: Talking points for phone calls

## Data Format

Your CSV or PDF file must contain these columns:

| Column | Required | Format | Notes |
|--------|----------|--------|-------|
| name | Yes | Text | Member's full name |
| join_date | Yes | YYYY-MM-DD | Date member joined |
| last_activity | Yes | YYYY-MM-DD | Last gym visit |
| payment_status | No | Text | "active", "pending", etc. |
| email | No | Email | Contact email |
| phone | No | Phone | Contact phone number |

### Example CSV
```csv
name,join_date,payment_status,last_activity,email,phone
John Smith,2026-03-01,active,2026-04-20,john@example.com,555-0101
Sarah Johnson,2026-02-15,active,2026-04-18,sarah@example.com,555-0102
Michael Brown,2026-01-10,active,2026-04-08,michael@example.com,555-0103
```

### PDF Format Support

PDFs work best when they contain tabular data in one of these formats:

**Option 1: CSV-like (Comma or Pipe Separated)**
```
name,join_date,payment_status,last_activity,email,phone
John Smith,2026-03-01,active,2026-04-20,john@example.com,555-0101
```

**Option 2: Table Format (Space-Separated)**
```
name                join_date       payment_status    last_activity     email
John Smith          2026-03-01      active            2026-04-20        john@example.com
Sarah Johnson       2026-02-15      active            2026-04-18        sarah@example.com
```

**Option 3: Simple List Format**
```
John Smith | 2026-03-01 | 2026-04-20 | john@example.com | 555-0101
Sarah Johnson | 2026-02-15 | 2026-04-18 | sarah@example.com | 555-0102
```

**Date Format:** YYYY-MM-DD or MM/DD/YYYY are both accepted.

⚠️ **Note:** If PDF upload fails, try converting to CSV first. PDFs with complex formatting or images may not parse correctly.

## At-Risk Detection

Members are flagged as at-risk based on inactivity:

- **14-30 days** → Moderate risk
- **30+ days** → Critical risk

The system automatically calculates days since last activity and assigns each member to the appropriate stage.

## Onboarding Stages

The platform tracks 6 onboarding stages:

1. **Day 1 - Welcome** (brand new members)
   - Send welcome email
   - Overview of facilities

2. **Day 7 - Check-in** (members 1-7 days old)
   - How's your first week?
   - Answer any questions

3. **Day 30 - Progress Check** (members 7-30 days old)
   - Review fitness goals
   - Celebrate early wins

4. **Return Incentive** (30+ days old AND inactive)
   - Offer free PT session
   - Win-back sequence

5. **Day 90 - Final Check-in** (members 30-90 days old)
   - Celebrate milestone
   - Upsell premium services

6. **Complete** (90+ days and active)
   - Fully onboarded member

## Scripts Included

Each onboarding stage has pre-written scripts for:
- **Email templates** - Ready to send or customize
- **Call scripts** - Talking points and questions
- **Contact info** - Email and/or phone automatically populated

All scripts are personalized with the member's name and account details.

## Building for Production

```bash
npm run build
npm start
```

The application uses a JSON-based storage system (no external database required for MVP).

## Data Storage

Member data is stored locally in:
```
./.gym-data/data.json
```

This file is created automatically on first upload.

## Customization

### Changing Gym Name

Edit [lib/scriptGenerator.ts](lib/scriptGenerator.ts) and update:
```typescript
const gymName = 'Your Gym Name';
```

### Adjusting At-Risk Thresholds

Edit [lib/analyzer.ts](lib/analyzer.ts) to change the day thresholds:
```typescript
// Currently: 14+ days = at-risk
const isAtRisk = daysSinceActivity >= 14;
```

### Modifying Scripts

Edit [lib/scriptGenerator.ts](lib/scriptGenerator.ts) to customize any script template.

## API Endpoints

- `POST /api/upload` - Upload and import member data
- `GET /api/members` - Get all members with analysis
- `GET /api/actions?memberId={id}` - Get script for specific member
- `GET /api/actions` - Get today's action queue

## Sample Data

A sample CSV file is included:
```bash
sample-members.csv
```

Use this to test the system without your own data.

## Tech Stack

- **Frontend**: Next.js + React + Tailwind CSS
- **Backend**: Node.js with Next.js API routes
- **Data**: JSON file storage
- **Parsing**: CSV and PDF support

## Next Steps / Future Features

- [ ] Automated email/SMS sending
- [ ] Calendar integration for scheduling calls
- [ ] Performance analytics and win rates
- [ ] Team collaboration features
- [ ] Database migration (PostgreSQL)
- [ ] Member feedback surveys
- [ ] A/B testing different scripts
- [ ] Retention metrics dashboard

## Troubleshooting

### PDF Upload Issues

**Problem:** "No valid members found in file"

**Solutions:**
1. **Convert to CSV instead** - Save your spreadsheet as `.csv` (works 100% reliably)
2. **Check date format** - Ensure dates are YYYY-MM-DD or MM/DD/YYYY
3. **Export cleanly** - If exporting from a CRM:
   - Use "Export as Table" or "Export as CSV"
   - Avoid exporting with images or formatting
   - Remove any header images or logos
4. **Verify columns exist** - File must have: name, join_date, last_activity
5. **Save as simple text PDF** - Not scanned image PDFs

**Best Practice:** Use CSV export from your CRM/spreadsheet for most reliable results.

### General Issues

- **Empty dashboard:** Upload a file first
- **Wrong dates:** Use format YYYY-MM-DD (e.g., 2026-04-21)
- **Missing email/phone:** These are optional, but recommended for scripts

## Support

For issues or questions, check the data format and ensure:
- CSV/PDF contains required columns: name, join_date, last_activity
- Dates are in YYYY-MM-DD format
- No empty required fields
- File size is reasonable (< 50MB)

## License

Built for gym retention optimization.

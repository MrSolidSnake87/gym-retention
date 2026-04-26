import { Readable } from 'stream';
import csv from 'csv-parser';
import pdfParse from 'pdf-parse';
import { Member } from './db';

export interface RawMember {
  name?: string;
  join_date?: string;
  payment_status?: string;
  last_activity?: string;
  email?: string;
  phone?: string;
  [key: string]: string | undefined;
}

export async function parseCSV(buffer: Buffer): Promise<Member[]> {
  return new Promise((resolve, reject) => {
    const members: Member[] = [];
    const rows: any[] = [];
    const stream = Readable.from([buffer]);

    stream
      .pipe(csv())
      .on('data', (row: any) => {
        rows.push(row);
      })
      .on('end', () => {
        // First try to detect gym system format
        if (rows.length > 0) {
          const firstRow = rows[0];
          const keys = Object.keys(firstRow).map(k => k.toLowerCase());

          // Check if this looks like a gym management system (AnytimeFitness, ClubWise, etc.)
          if ((keys.some(k => k.includes('first name') || k.includes('firstname')) &&
               keys.some(k => k.includes('surname'))) ||
              (keys.includes('joining date') && keys.includes('last visit'))) {
            // Parse as gym system format
            for (const row of rows) {
              const member = extractGymSystemMember(row);
              if (member) members.push(member);
            }
            resolve(members);
            return;
          }
        }

        // Fall back to standard format
        for (const row of rows) {
          const member = extractMemberData(row);
          if (member) members.push(member);
        }
        resolve(members);
      })
      .on('error', reject);
  });
}

export async function parsePDF(buffer: Buffer): Promise<Member[]> {
  try {
    const data = await pdfParse(buffer);
    let text = data.text;

    const members: Member[] = [];
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new Error('PDF does not contain enough data rows');
    }

    // Try multiple parsing strategies
    let parsed = tryClubWiseFormat(lines);
    if (parsed.length > 0) return parsed;

    parsed = tryCSVFormat(lines);
    if (parsed.length > 0) return parsed;

    parsed = tryTableFormat(lines);
    if (parsed.length > 0) return parsed;

    parsed = tryFreeFormFormat(lines);
    if (parsed.length > 0) return parsed;

    throw new Error('Could not parse PDF - unsupported format');
  } catch (error) {
    console.error('PDF parse error:', error instanceof Error ? error.message : String(error));
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function tryClubWiseFormat(lines: string[]): Member[] {
  // ClubWise format: Surname FirstName MemberNo JoinedOn EndOn LastVisit Membership Fee ... Mobile
  const members: Member[] = [];

  // Find header row (contains "Surname" - headers may be on multiple lines)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    if (lines[i].toLowerCase().includes('surname')) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return [];

  // Parse data rows
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines and section headers
    if (!line || line.startsWith('-') || line.toLowerCase().includes('clubwise')) continue;

    // Look for date pattern DD/MM/YYYY
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})/g;
    const dates = [...line.matchAll(datePattern)];

    if (dates.length >= 2) {
      const member = parseClubWiseLine(line, dates);
      const validated = extractMemberData(member);
      if (validated) members.push(validated);
    }
  }

  return members;
}

function parseClubWiseLine(
  line: string,
  dateMatches: RegExpMatchArray[]
): RawMember {
  // Extract components from ClubWise line
  // ClubWise format concatenates: Surname + FirstName + MemberNo + Phone + Dates + Membership

  const joinDate = dateMatches[0]?.[0] || '';
  const lastActivity = dateMatches[1]?.[0] || '';

  // Extract member ID (AGKN followed by 5 digits)
  const memberIdMatch = line.match(/AGKN\d{5}/);

  // Extract phone (07 followed by 9-10 digits)
  const phoneMatch = line.match(/07\d{9,10}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  // Extract membership type
  let paymentStatus = 'active';
  if (line.includes('Direct Debit')) paymentStatus = 'Direct Debit';
  else if (line.includes('Annual')) paymentStatus = 'Annual';
  else if (line.includes('Monthly')) paymentStatus = 'Monthly';
  else if (line.includes('Better Health')) paymentStatus = 'Better Health';
  else if (line.includes('Complimentary')) paymentStatus = 'Complimentary';

  // Extract name: everything before the member ID
  let name = 'Unknown';
  if (memberIdMatch) {
    const memberIdIndex = line.indexOf(memberIdMatch[0]);
    let fullName = line.substring(0, memberIdIndex).trim();

    // Split surname and first name
    // Look for particles that indicate surname boundaries (De, Da, Van, Mc, etc.)
    const lowerName = fullName.toLowerCase();
    const particles = ['de', 'da', 'di', 'van', 'von', 'mc', 'mac', 'del', 'des'];

    let splitIndex = -1;

    // Look for each particle in the name
    for (const particle of particles) {
      let searchPos = 0;
      while (true) {
        const idx = lowerName.indexOf(particle, searchPos);
        if (idx === -1) break;

        // Check if this looks like a real particle occurrence
        // (preceded by lowercase letters, followed by uppercase or end of string)
        const beforeChar = idx > 0 ? fullName[idx - 1] : '';
        const afterChar = idx + particle.length < fullName.length ? fullName[idx + particle.length] : '';

        // Particle should have lowercase before it and capital after (or be at start/end)
        if ((idx === 0 || beforeChar === beforeChar.toLowerCase()) &&
            (afterChar === '' || afterChar === afterChar.toUpperCase())) {
          // Found a valid particle - look for the capital before it (start of surname)
          for (let i = idx - 1; i >= 0; i--) {
            if (fullName[i] === fullName[i].toUpperCase() && fullName[i] !== '-') {
              splitIndex = i;
              break;
            }
          }
          if (splitIndex !== -1) break;
        }
        searchPos = idx + 1;
      }
      if (splitIndex !== -1) break;
    }

    // If no particle found, look for lowercase-to-uppercase transition
    if (splitIndex === -1) {
      for (let i = 1; i < fullName.length; i++) {
        if (fullName[i] === fullName[i].toUpperCase() && fullName[i - 1] === fullName[i - 1].toLowerCase()) {
          splitIndex = i;
          break;
        }
      }
    }

    // Fallback: split on second capital letter
    if (splitIndex === -1) {
      let capitalCount = 0;
      for (let i = 0; i < fullName.length; i++) {
        if (fullName[i] === fullName[i].toUpperCase() && fullName[i] !== '-') {
          capitalCount++;
          if (capitalCount === 2) {
            splitIndex = i;
            break;
          }
        }
      }
    }

    if (splitIndex !== -1) {
      const firstName = fullName.substring(splitIndex).trim();
      const surname = fullName.substring(0, splitIndex).trim();
      name = `${firstName} ${surname}`;
    } else {
      name = fullName;
    }
  }

  // Extract email if present
  const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch ? emailMatch[0] : '';

  return {
    name,
    join_date: joinDate,
    payment_status: paymentStatus,
    last_activity: lastActivity,
    email,
    phone,
  };
}

function tryCSVFormat(lines: string[]): Member[] {
  // Try to parse as comma or pipe separated values
  const members: Member[] = [];

  // Try each separator
  for (const sep of [',', '|', ';']) {
    const testLine = lines[0];
    if (!testLine.includes(sep)) continue;

    const headerParts = testLine.split(sep).map((p) => p.trim());
    if (headerParts.length < 4) continue;

    // Check if looks like a header
    const headerLower = testLine.toLowerCase();
    if (!headerLower.includes('name') && !headerLower.includes('member')) continue;

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(sep).map((p) => p.trim());
      if (parts.length < 4) continue;

      const member = {
        name: parts[0] || '',
        join_date: parts[1] || '',
        payment_status: parts[2] || '',
        last_activity: parts[3] || '',
        email: parts[4] || '',
        phone: parts[5] || '',
      };

      const validated = extractMemberData(member);
      if (validated) members.push(validated);
    }

    if (members.length > 0) return members;
  }

  return [];
}

function tryTableFormat(lines: string[]): Member[] {
  // Try to parse as space-separated table (common in PDF exports)
  const members: Member[] = [];

  // Skip to first data line (skip headers)
  let startIdx = 0;
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    if (lines[i].toLowerCase().includes('name')) {
      startIdx = i + 1;
      break;
    }
  }

  // Parse data lines
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const datePattern = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/g;
    const dates = line.match(datePattern) || [];

    if (dates.length >= 2) {
      // Found dates, extract member data
      const parts = line.split(/\s{2,}/).filter((p) => p.trim());

      const member = {
        name: parts[0] || '',
        join_date: dates[0] || '',
        payment_status: parts[2] || 'active',
        last_activity: dates[1] || '',
        email: parts.find((p) => p.includes('@')) || '',
        phone: parts.find((p) => /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(p)) || '',
      };

      const validated = extractMemberData(member);
      if (validated) members.push(validated);
    }
  }

  return members;
}

function tryFreeFormFormat(lines: string[]): Member[] {
  // Last resort: try to parse line-by-line looking for patterns
  const members: Member[] = [];

  for (const line of lines) {
    // Skip header-like lines
    if (line.toLowerCase().includes('name') || line.toLowerCase().includes('---')) continue;

    const datePattern = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/g;
    const dates = line.match(datePattern) || [];
    const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = line.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{1,3}\s?\d{3,14}/);

    if (dates.length >= 2 && line.length > 10) {
      // Extract name (everything before first date)
      const firstDatePos = line.search(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/);
      const name = line.substring(0, firstDatePos).trim();

      if (name.length > 2) {
        const member = {
          name,
          join_date: dates[0] || '',
          payment_status: line.includes('inactive') ? 'inactive' : 'active',
          last_activity: dates[1] || '',
          email: emailMatch ? emailMatch[0] : '',
          phone: phoneMatch ? phoneMatch[0] : '',
        };

        const validated = extractMemberData(member);
        if (validated) members.push(validated);
      }
    }
  }

  return members;
}

function extractGymSystemMember(row: any): Member | null {
  // Handle gym management system exports (AnytimeFitness, ClubWise, PingPoint, etc.)
  // These typically have columns like: First name, Surname, Joining Date, Last visit, Status, Email address, Mobile number

  // Combine first and last name
  const findKey = (row: any, patterns: string[]): string => {
    const keys = Object.keys(row);
    for (const pattern of patterns) {
      const match = keys.find(k => k.toLowerCase().includes(pattern.toLowerCase()));
      if (match) return match;
    }
    return '';
  };

  const firstNameKey = findKey(row, ['first name', 'firstname', 'forename']);
  const surnameKey = findKey(row, ['surname', 'last name', 'lastname', 'family name']);
  const joinDateKey = findKey(row, ['joining date', 'join date', 'joined date', 'membership start']);
  const lastVisitKey = findKey(row, ['last visit', 'last activity', 'last attendance']);
  const statusKey = findKey(row, ['status', 'membership status', 'account status']);
  const emailKey = findKey(row, ['email', 'email address', 'e-mail']);
  const phoneKey = findKey(row, ['mobile', 'phone', 'mobile number', 'telephone']);

  const firstName = (row[firstNameKey] || '').trim();
  const surname = (row[surnameKey] || '').trim();
  const name = `${firstName} ${surname}`.trim();

  const joinDate = (row[joinDateKey] || '').trim();
  const lastActivity = (row[lastVisitKey] || '').trim();
  let status = (row[statusKey] || 'active').trim();

  if (!name || !joinDate || !lastActivity) {
    return null;
  }

  // Map status values to standard ones
  const statusMap: { [key: string]: string } = {
    'active': 'active',
    'not setup': 'pending',
    'account onhold': 'suspended',
    'frozen': 'suspended',
    'cancelled': 'cancelled',
    'on hold': 'suspended',
    'paused': 'suspended',
    'inactive': 'inactive',
  };

  status = statusMap[status.toLowerCase()] || 'active';

  // Validate dates
  if (!isValidDate(joinDate) || !isValidDate(lastActivity)) {
    return null;
  }

  return {
    name,
    join_date: formatDate(joinDate),
    payment_status: status,
    last_activity: formatDate(lastActivity),
    email: (row[emailKey] || '').trim() || undefined,
    phone: (row[phoneKey] || '').trim() || undefined,
  };
}

function extractMemberData(row: RawMember): Member | null {
  const name = (row.name || row.Name || row.NAME || '').trim();
  const joinDate = (row.join_date || row['Join Date'] || row.join_Date || '').trim();
  const lastActivity = (row.last_activity || row['Last Activity'] || row.last_Activity || '').trim();

  if (!name || !joinDate || !lastActivity) {
    return null;
  }

  // Validate dates are in reasonable format
  if (!isValidDate(joinDate) || !isValidDate(lastActivity)) {
    return null;
  }

  return {
    name,
    join_date: formatDate(joinDate),
    payment_status: (row.payment_status || row['Payment Status'] || 'active').trim(),
    last_activity: formatDate(lastActivity),
    email: (row.email || row.Email || row.EMAIL || '').trim() || undefined,
    phone: (row.phone || row.Phone || row.PHONE || '').trim() || undefined,
  };
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

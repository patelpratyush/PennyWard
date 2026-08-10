import {
  Body, Container, Column, Head, Heading, Hr, Html, Preview, Row, Section, Text,
} from '@react-email/components'
import type { WeeklyDigestData } from '@/lib/digest'

const money = (n: number) => `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function WeeklyDigestEmail({ data, appUrl }: { data: WeeklyDigestData; appUrl: string }) {
  const greeting = data.userName ? `Hi ${data.userName.split(' ')[0]},` : 'Hi,'
  return (
    <Html>
      <Head />
      <Preview>Your week: {data.weekNet >= 0 ? '+' : '-'}{money(data.weekNet)} net, {money(data.netWorth)} net worth</Preview>
      <Body style={{ backgroundColor: '#f4eee0', fontFamily: 'Helvetica, Arial, sans-serif', color: '#17140f' }}>
        <Container style={{ maxWidth: 480, margin: '0 auto', padding: '32px 24px' }}>
          <Heading style={{ fontSize: 20, marginBottom: 4 }}>Pennyward — your week</Heading>
          <Text style={{ color: '#5c5648', fontSize: 14 }}>{greeting} here's what happened in your finances this week.</Text>

          <Section style={{ backgroundColor: '#ece5d5', borderRadius: 8, padding: '16px 20px', margin: '20px 0' }}>
            <Row>
              <Column><Text style={{ fontSize: 12, color: '#5c5648', margin: 0 }}>Income</Text><Text style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{money(data.weekIncome)}</Text></Column>
              <Column><Text style={{ fontSize: 12, color: '#5c5648', margin: 0 }}>Expenses</Text><Text style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{money(data.weekExpenses)}</Text></Column>
              <Column><Text style={{ fontSize: 12, color: '#5c5648', margin: 0 }}>Net</Text><Text style={{ fontSize: 18, fontWeight: 700, margin: 0, color: data.weekNet >= 0 ? '#3a6b3a' : '#a13a2f' }}>{data.weekNet >= 0 ? '+' : '-'}{money(data.weekNet)}</Text></Column>
            </Row>
          </Section>

          <Text style={{ fontSize: 13, color: '#5c5648' }}>Net worth: <strong>{money(data.netWorth)}</strong></Text>

          {data.topCategories.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e0d8c4', margin: '20px 0' }} />
              <Text style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Top spending this week</Text>
              {data.topCategories.map((c) => (
                <Text key={c.name} style={{ fontSize: 13, margin: '2px 0' }}>{c.name} — {money(c.amount)}</Text>
              ))}
            </>
          )}

          {data.upcomingBills.length > 0 && (
            <>
              <Hr style={{ borderColor: '#e0d8c4', margin: '20px 0' }} />
              <Text style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Upcoming in the next 14 days</Text>
              {data.upcomingBills.map((b) => (
                <Text key={b.merchant} style={{ fontSize: 13, margin: '2px 0' }}>{b.merchant} — {money(b.amount)} on {b.nextExpected}</Text>
              ))}
            </>
          )}

          {data.debtFreeDate && (
            <>
              <Hr style={{ borderColor: '#e0d8c4', margin: '20px 0' }} />
              <Text style={{ fontSize: 13 }}>Debt-free target: <strong>{data.debtFreeDate}</strong></Text>
            </>
          )}

          <Hr style={{ borderColor: '#e0d8c4', margin: '24px 0 12px' }} />
          <Text style={{ fontSize: 12, color: '#8a8370' }}>
            <a href={`${appUrl}/app/dashboard`} style={{ color: '#a13a2f' }}>Open Pennyward</a> ·{' '}
            <a href={`${appUrl}/app/settings/profile`} style={{ color: '#8a8370' }}>Manage email preferences</a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

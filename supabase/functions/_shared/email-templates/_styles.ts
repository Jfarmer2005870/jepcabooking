// Shared Jepca brand styles for auth emails
// Teal primary (#1a9d8a), amber accent (#f59e0b)

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  margin: 0,
  padding: 0,
}

export const container = {
  padding: '32px 28px',
  maxWidth: '560px',
  margin: '0 auto',
}

export const brand = {
  fontFamily: '"Space Grotesk", Inter, Arial, sans-serif',
  fontSize: '24px',
  fontWeight: 700 as const,
  color: '#1a9d8a',
  margin: '0 0 28px',
  letterSpacing: '-0.02em',
}

export const h1 = {
  fontFamily: '"Space Grotesk", Inter, Arial, sans-serif',
  fontSize: '24px',
  fontWeight: 700 as const,
  color: '#0f2a26',
  margin: '0 0 18px',
  letterSpacing: '-0.01em',
}

export const text = {
  fontSize: '15px',
  color: '#475467',
  lineHeight: '1.6',
  margin: '0 0 20px',
}

export const link = {
  color: '#1a9d8a',
  textDecoration: 'underline',
}

export const button = {
  backgroundColor: '#1a9d8a',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const codeStyle = {
  fontFamily: '"Space Grotesk", Courier, monospace',
  fontSize: '28px',
  fontWeight: 700 as const,
  color: '#1a9d8a',
  letterSpacing: '0.15em',
  margin: '0 0 28px',
  padding: '16px 20px',
  backgroundColor: '#f0fdfa',
  borderRadius: '10px',
  textAlign: 'center' as const,
  border: '1px solid #ccfbf1',
}

export const footer = {
  fontSize: '13px',
  color: '#98a2b3',
  margin: '32px 0 0',
  paddingTop: '20px',
  borderTop: '1px solid #eaecf0',
  lineHeight: '1.5',
}

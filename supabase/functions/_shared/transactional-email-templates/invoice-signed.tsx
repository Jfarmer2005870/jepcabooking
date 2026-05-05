/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, brand, h1, text, button, card, detailRow, label, footer } from './_styles.ts'

interface Props {
  serviceName?: string
  businessName?: string
  invoiceNumber?: string
  scheduledDate?: string
  scheduledTime?: string
  serviceAddress?: string
  servicePrice?: string
  travelDistanceMiles?: string
  travelFee?: string
  platformFee?: string
  total?: string
  signedByName?: string
  signedAt?: string
  invoiceUrl?: string
}

const InvoiceSigned = ({
  serviceName,
  businessName,
  invoiceNumber,
  scheduledDate,
  scheduledTime,
  serviceAddress,
  servicePrice,
  travelDistanceMiles,
  travelFee,
  platformFee,
  total,
  signedByName,
  signedAt,
  invoiceUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your signed invoice from {businessName ?? 'your provider'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Jepca</Text>
        <Heading style={h1}>Your invoice has been signed</Heading>
        <Text style={text}>
          {businessName ?? 'Your service provider'} has signed the invoice
          {serviceName ? ` for "${serviceName}"` : ''}. A summary is below.
        </Text>

        <Section style={card}>
          {invoiceNumber && (
            <Text style={detailRow}><span style={label}>Invoice #</span> {invoiceNumber}</Text>
          )}
          {scheduledDate && (
            <Text style={detailRow}>
              <span style={label}>Scheduled</span> {scheduledDate}{scheduledTime ? ` · ${scheduledTime}` : ''}
            </Text>
          )}
          {serviceAddress && (
            <Text style={detailRow}><span style={label}>Location</span> {serviceAddress}</Text>
          )}
          <Hr style={{ borderColor: '#ccfbf1', margin: '12px 0' }} />
          {servicePrice && (
            <Text style={detailRow}><span style={label}>Service</span> ${servicePrice}</Text>
          )}
          {travelFee && (
            <Text style={detailRow}>
              <span style={label}>Travel{travelDistanceMiles ? ` (${travelDistanceMiles} mi)` : ''}</span> ${travelFee}
            </Text>
          )}
          {platformFee && (
            <Text style={detailRow}><span style={label}>Platform fee (5%)</span> ${platformFee}</Text>
          )}
          {total && (
            <Text style={{ ...detailRow, fontWeight: 700, fontSize: '16px', marginTop: '8px' }}>
              <span style={label}>Total</span> ${total}
            </Text>
          )}
        </Section>

        {(signedByName || signedAt) && (
          <Text style={text}>
            Signed{signedByName ? ` by ${signedByName}` : ''}{signedAt ? ` on ${signedAt}` : ''}.
          </Text>
        )}

        {invoiceUrl && (
          <Button style={button} href={invoiceUrl}>View invoice</Button>
        )}

        <Text style={footer}>Thanks for using Jepca.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceSigned,
  subject: (d: Record<string, any>) =>
    `Signed invoice from ${d.businessName ?? 'your provider'}`,
  displayName: 'Invoice signed',
  previewData: {
    serviceName: 'Deep house cleaning',
    businessName: 'Sparkle Pros',
    invoiceNumber: 'A1B2C3D4',
    scheduledDate: 'Jan 15, 2026',
    scheduledTime: '10:00 AM',
    serviceAddress: '123 Main St, Springfield',
    servicePrice: '120.00',
    travelDistanceMiles: '8.4',
    travelFee: '0.00',
    platformFee: '6.00',
    total: '126.00',
    signedByName: 'Jane Doe',
    signedAt: 'May 5, 2026 2:14 PM',
    invoiceUrl: 'https://jepcabooking.lovable.app/dashboard',
  },
} satisfies TemplateEntry

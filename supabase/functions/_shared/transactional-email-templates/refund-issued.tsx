/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, brand, h1, text, card, detailRow, label, footer } from './_styles.ts'

interface Props {
  serviceName?: string
  refundAmount?: string
  fullRefund?: boolean
}

const RefundIssued = ({ serviceName, refundAmount, fullRefund }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A refund has been issued to your card</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Jepca</Text>
        <Heading style={h1}>Refund issued</Heading>
        <Text style={text}>
          {fullRefund ? 'A full refund' : 'A refund'} has been issued for your booking{serviceName ? ` "${serviceName}"` : ''}. It will appear on your statement within 5–10 business days, depending on your bank.
        </Text>
        {refundAmount && (
          <div style={card}>
            <Text style={detailRow}><span style={label}>Refund amount: </span>${refundAmount}</Text>
            {serviceName && <Text style={detailRow}><span style={label}>Service: </span>{serviceName}</Text>}
          </div>
        )}
        <Text style={footer}>Questions about this refund? Reply to this email.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RefundIssued,
  subject: 'Your Jepca refund has been issued',
  displayName: 'Refund issued',
  previewData: {
    serviceName: 'Deep house cleaning',
    refundAmount: '157.50',
    fullRefund: true,
  },
} satisfies TemplateEntry
